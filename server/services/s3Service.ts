import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { Response } from 'express';

// Generic resource type - microservices can define their own types
export type ResourceType = string;

interface S3Config {
  bucketUri: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

interface UploadOptions {
  tenantId: string;
  type: ResourceType; // Generic resource type (e.g., 'document', 'image', 'report')
  originalName: string;
  id?: string; // Entity ID 
  buffer: Buffer;
  contentType?: string;
  metadata?: Record<string, string>; // Additional metadata
}

interface SignedUrlOptions {
  key: string;
  expiresIn?: number; // Seconds, default 3600 (1 hour)
  operation?: 'get' | 'put';
  contentType?: string; // For PUT operations
}

export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private bucketUri: string = '';
  private enabled: boolean = false;
  private servicePrefix: string = '';

  constructor(servicePrefix?: string) {
    // Service prefix for organizing files (e.g., 'reports', 'documents', 'analytics')
    this.servicePrefix = servicePrefix || process.env.SERVICE_PREFIX || 'microservice';
    
    try {
      const config = this.loadConfig();
      if (config) {
        this.initializeS3Client(config);
        this.enabled = true;
      } else {
        console.log('S3 Service disabled - no credentials configured');
      }
    } catch (error) {
      console.warn('S3 Service initialization failed:', error);
      console.log('S3 Service disabled - will return no-op responses');
    }
  }

  private loadConfig(): S3Config | null {
    // Support both naming conventions for backwards compatibility
    const bucketUri = process.env.S3_DEV_BUCKET_URI || process.env.S3_BUCKET_URI;
    const accessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || process.env.S3_REGION;

    // S3 is optional - microservice can run without it
    if (!bucketUri || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      bucketUri,
      accessKeyId,
      secretAccessKey,
      region,
    };
  }

  private initializeS3Client(config: S3Config): void {
    this.bucketUri = config.bucketUri;
    this.bucketName = this.parseBucketName(config.bucketUri);
    
    const region = config.region || this.parseRegion(config.bucketUri) || 'us-east-1';
    
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    
    console.log(`S3 Service enabled with bucket: ${this.bucketName}, region: ${region}, prefix: ${this.servicePrefix}`);
  }

  private parseBucketName(uri: string): string {
    // Handle s3:// format
    if (uri.startsWith('s3://')) {
      return uri.replace('s3://', '').split('/')[0];
    }
    
    // Handle https:// format
    if (uri.startsWith('https://')) {
      const match = uri.match(/https:\/\/([^.]+)\.s3/);
      if (match) {
        return match[1];
      }
    }
    
    // Assume it's just the bucket name
    return uri.split('/')[0];
  }

  private parseRegion(uri: string): string | null {
    // Try to extract region from URL like https://bucket.s3.us-west-2.amazonaws.com
    const match = uri.match(/\.s3\.([^.]+)\.amazonaws\.com/);
    return match ? match[1] : null;
  }

  /**
   * Check if S3 service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get content type from file extension
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const contentTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      
      // Media
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      
      // Archives
      zip: 'application/zip',
      tar: 'application/x-tar',
      gz: 'application/gzip',
    };
    
    return contentTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Generate a unique filename with tenant and type information
   */
  private generateFileName(options: {
    tenantId: string;
    type: ResourceType;
    originalName: string;
    id?: string;
  }): string {
    const timestamp = Date.now();
    const extension = options.originalName.split('.').pop() || 'bin';
    const sanitizedName = options.originalName
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
      .toLowerCase()
      .substring(0, 50); // Limit length
    
    // Format: tenantId_type_id_timestamp_name.ext
    const parts = [
      options.tenantId,
      options.type,
      options.id || 'noid',
      timestamp,
      sanitizedName,
    ].filter(Boolean);
    
    return `${parts.join('_')}.${extension}`;
  }

  /**
   * Generate S3 key (path) for a file
   */
  private generateS3Key(tenantId: string, type: ResourceType, fileName: string): string {
    // Format: <service-prefix>/<tenant_id>/<type>/<filename>
    return `${this.servicePrefix}/${tenantId}/${type}/${fileName}`;
  }

  /**
   * Upload a file to S3
   */
  async upload(options: UploadOptions): Promise<{
    success: boolean;
    key?: string;
    fileName?: string;
    url?: string;
    error?: string;
  }> {
    if (!this.enabled || !this.s3Client) {
      return { 
        success: false, 
        error: 'S3 service is not configured' 
      };
    }

    const fileName = this.generateFileName({
      tenantId: options.tenantId,
      type: options.type,
      originalName: options.originalName,
      id: options.id,
    });
    
    const key = this.generateS3Key(options.tenantId, options.type, fileName);
    
    // Determine content type
    const contentType = options.contentType || this.getContentType(options.originalName);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: options.buffer,
      ContentType: contentType,
      // Add metadata for easier management
      Metadata: {
        tenantId: options.tenantId,
        type: options.type,
        originalName: options.originalName,
        uploadedAt: new Date().toISOString(),
        ...(options.id && { entityId: options.id }),
        ...options.metadata,
      },
    });

    try {
      await this.s3Client.send(command);
      
      return {
        success: true,
        key,
        fileName,
        url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      return {
        success: false,
        error: `Failed to upload: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generate a signed URL for accessing an S3 object
   */
  async getSignedUrl(options: SignedUrlOptions): Promise<string | null> {
    if (!this.enabled || !this.s3Client) {
      return null;
    }

    const command = options.operation === 'put' 
      ? new PutObjectCommand({
          Bucket: this.bucketName,
          Key: options.key,
          ...(options.contentType && { ContentType: options.contentType }),
        })
      : new GetObjectCommand({
          Bucket: this.bucketName,
          Key: options.key,
        });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // Default 1 hour
      });
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }

  /**
   * Download a file from S3 and stream to response
   */
  async download(key: string, res: Response): Promise<void> {
    if (!this.enabled || !this.s3Client) {
      res.status(503).json({ error: 'S3 service is not configured' });
      return;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      
      // Set response headers
      if (response.ContentType) {
        res.set('Content-Type', response.ContentType);
      }
      if (response.ContentLength) {
        res.set('Content-Length', response.ContentLength.toString());
      }
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Stream the body to response
      if (response.Body instanceof Readable) {
        response.Body.pipe(res);
      } else {
        throw new Error('Unexpected response body type');
      }
    } catch (error: any) {
      console.error('Error downloading from S3:', error);
      if (error?.name === 'NoSuchKey') {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: 'Failed to retrieve file' });
      }
    }
  }

  /**
   * Check if an object exists in S3
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.s3Client) {
      return false;
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * List objects for a tenant and optional type
   */
  async list(tenantId: string, type?: ResourceType, maxKeys: number = 1000): Promise<{
    success: boolean;
    keys?: string[];
    error?: string;
  }> {
    if (!this.enabled || !this.s3Client) {
      return { 
        success: false, 
        error: 'S3 service is not configured' 
      };
    }

    const prefix = type 
      ? `${this.servicePrefix}/${tenantId}/${type}/`
      : `${this.servicePrefix}/${tenantId}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    try {
      const response = await this.s3Client.send(command);
      return {
        success: true,
        keys: response.Contents?.map(obj => obj.Key!) || [],
      };
    } catch (error) {
      console.error('Error listing S3 objects:', error);
      return {
        success: false,
        error: `Failed to list objects: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Copy an object within S3
   */
  async copy(sourceKey: string, destinationKey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.enabled || !this.s3Client) {
      return { 
        success: false, 
        error: 'S3 service is not configured' 
      };
    }

    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    });

    try {
      await this.s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error copying S3 object:', error);
      return {
        success: false,
        error: `Failed to copy object: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Delete an object from S3
   */
  async delete(key: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.enabled || !this.s3Client) {
      return { 
        success: false, 
        error: 'S3 service is not configured' 
      };
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting S3 object:', error);
      return {
        success: false,
        error: `Failed to delete object: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// Singleton instance
let s3Service: S3Service;

/**
 * Get or create S3 service instance
 * @param servicePrefix - Optional prefix for organizing files (defaults to 'microservice' or SERVICE_PREFIX env var)
 */
export function getS3Service(servicePrefix?: string): S3Service {
  if (!s3Service) {
    s3Service = new S3Service(servicePrefix);
  }
  return s3Service;
}
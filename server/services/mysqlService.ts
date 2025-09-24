import mysql from 'mysql2/promise';

export interface Location {
  id: string;
  name: string;
  tenantId: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Room {
  id: string;
  name: string;
  locationId: string;
  locationName?: string;
  capacity?: number;
  tenantId: string;
  status: 'active' | 'inactive';
}

export interface Tag {
  id: number;
  label: string;
  locationIds?: string[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class MySQLService {
  private pool: mysql.Pool;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log('MySQL service initialized');
  }

  private validateTenantId(tenantId: string): void {
    if (!tenantId || !this.TENANT_ID_PATTERN.test(tenantId)) {
      throw new Error(`Invalid tenant ID: ${tenantId}`);
    }
  }

  private isCacheValid<T>(cached: CacheEntry<T> | null): cached is CacheEntry<T> {
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_TTL;
  }

  async getLocations(tenantId: string): Promise<Location[]> {
    this.validateTenantId(tenantId);
    
    const cacheKey = `locations_${tenantId}`;
    const cached = this.cache.get(cacheKey) as CacheEntry<Location[]> | undefined;
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const connection = await this.pool.getConnection();
    try {
      // Query tenant-specific database
      const query = `
        SELECT id, name, status, created_at as createdAt, updated_at as updatedAt
        FROM \`${tenantId}\`.locations
        WHERE status = 'active'
        ORDER BY name
      `;
      
      const [rows] = await connection.execute<any[]>(query);
      
      const locations: Location[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        tenantId: tenantId,
        status: row.status || 'active',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      // Update cache
      this.cache.set(cacheKey, {
        data: locations,
        timestamp: Date.now()
      });

      return locations;
    } catch (error) {
      console.error(`Failed to fetch locations for tenant ${tenantId}:`, error);
      throw new Error('Unable to fetch locations from parent database');
    } finally {
      connection.release();
    }
  }

  async getRooms(tenantId: string, locationId?: string): Promise<Room[]> {
    this.validateTenantId(tenantId);
    
    const cacheKey = locationId 
      ? `rooms_${tenantId}_${locationId}` 
      : `rooms_${tenantId}_all`;
    const cached = this.cache.get(cacheKey) as CacheEntry<Room[]> | undefined;
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const connection = await this.pool.getConnection();
    try {
      let query = `
        SELECT r.id, r.room as name, r.lid as locationId, r.capacity,
               l.name as locationName
        FROM \`${tenantId}\`.rooms r
        LEFT JOIN \`${tenantId}\`.locations l ON r.lid = l.id
        WHERE r.status = 1 AND r.room_type = 0
      `;
      const params: any[] = [];

      if (locationId) {
        query += ' AND r.lid = ?';
        params.push(locationId);
      }

      query += ' ORDER BY r.room';
      
      const [rows] = await connection.execute<any[]>(query, params);
      
      const rooms: Room[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        locationId: row.locationId,
        locationName: row.locationName,
        capacity: row.capacity,
        tenantId: tenantId,
        status: 'active',
      }));

      // Update cache
      this.cache.set(cacheKey, {
        data: rooms,
        timestamp: Date.now()
      });

      return rooms;
    } catch (error) {
      console.error(`Failed to fetch rooms for tenant ${tenantId}:`, error);
      throw new Error('Unable to fetch rooms from parent database');
    } finally {
      connection.release();
    }
  }

  async getTags(tenantId: string): Promise<Tag[]> {
    this.validateTenantId(tenantId);
    
    const cacheKey = `tags_${tenantId}`;
    const cached = this.cache.get(cacheKey) as CacheEntry<Tag[]> | undefined;
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const connection = await this.pool.getConnection();
    try {
      // Get tags with their associated locations
      const query = `
        SELECT DISTINCT t.id, t.name as label
        FROM \`${tenantId}\`.location_tags lt
        INNER JOIN \`${tenantId}\`.tags t ON lt.tag_id = t.id
        ORDER BY t.name
      `;
      
      const [tagRows] = await connection.execute<any[]>(query);
      
      // Get location associations for each tag
      const tags: Tag[] = [];
      for (const tagRow of tagRows) {
        const locQuery = `
          SELECT location_id
          FROM \`${tenantId}\`.location_tags
          WHERE tag_id = ?
        `;
        const [locRows] = await connection.execute<any[]>(locQuery, [tagRow.id]);
        
        tags.push({
          id: tagRow.id,
          label: tagRow.label,
          locationIds: locRows.map(row => row.location_id),
        });
      }

      // Update cache
      this.cache.set(cacheKey, {
        data: tags,
        timestamp: Date.now()
      });

      return tags;
    } catch (error) {
      console.error(`Failed to fetch tags for tenant ${tenantId}:`, error);
      throw new Error('Unable to fetch tags from parent database');
    } finally {
      connection.release();
    }
  }

  async getLocationsByTag(tenantId: string, tagId: number): Promise<Location[]> {
    this.validateTenantId(tenantId);
    
    const connection = await this.pool.getConnection();
    try {
      const query = `
        SELECT DISTINCT l.id, l.name, l.status
        FROM \`${tenantId}\`.locations l
        INNER JOIN \`${tenantId}\`.location_tags lt ON l.id = lt.location_id
        WHERE lt.tag_id = ? AND l.status = 'active'
        ORDER BY l.name
      `;
      
      const [rows] = await connection.execute<any[]>(query, [tagId]);
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        tenantId: tenantId,
        status: row.status || 'active',
      }));
    } catch (error) {
      console.error(`Failed to fetch locations by tag for tenant ${tenantId}:`, error);
      throw new Error('Unable to fetch locations by tag');
    } finally {
      connection.release();
    }
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear only tenant-specific cache
      for (const key of this.cache.keys()) {
        if (key.includes(tenantId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
let mysqlService: MySQLService | null = null;

export function getMySQLService(): MySQLService {
  if (!mysqlService) {
    mysqlService = new MySQLService();
  }
  return mysqlService;
}
declare namespace Express {
  export interface Request {
    /**
     * Populated by TenantMiddleware
     */
    domainId?: string;
  }
}

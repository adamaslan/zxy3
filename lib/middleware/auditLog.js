/**
 * Prisma Middleware for Audit Logging
 * Automatically logs all CREATE, UPDATE, DELETE operations
 *
 * Usage:
 *   prisma.$use(auditLogMiddleware)
 */

async function auditLogMiddleware(params, next) {
  const { model, action, args, dataPath } = params;

  // Only audit data mutations, not queries
  if (!['create', 'update', 'delete', 'deleteMany', 'updateMany'].includes(action)) {
    return next(params);
  }

  // Skip auditing the audit_log table itself (avoid infinite recursion)
  if (model === 'AuditLog') {
    return next(params);
  }

  // Execute the actual operation
  const result = await next(params);

  // Prepare audit log entry
  const auditAction = mapActionToAuditAction(action);
  const { oldValues, newValues, recordId } = extractAuditData(action, args, result);

  // Log the operation asynchronously (don't block the original operation)
  // This prevents deadlocks and keeps response times fast
  logAuditEvent({
    tableName: model,
    action: auditAction,
    recordId,
    oldValues,
    newValues,
    changedBy: args.data?.changedBy || 'SYSTEM'
  }).catch(error => {
    console.error(`[Audit Log] Failed to log ${model}.${action}:`, error);
    // Don't throw - audit log failure shouldn't break the main operation
  });

  return result;
}

/**
 * Helper: Map Prisma action to audit action
 */
function mapActionToAuditAction(action) {
  const mapping = {
    create: 'INSERT',
    createMany: 'INSERT',
    update: 'UPDATE',
    updateMany: 'UPDATE',
    delete: 'DELETE',
    deleteMany: 'DELETE'
  };
  return mapping[action] || 'UPDATE';
}

/**
 * Helper: Extract old/new values and record ID
 */
function extractAuditData(action, args, result) {
  let oldValues = null;
  let newValues = null;
  let recordId = null;

  switch (action) {
    case 'create':
    case 'createMany':
      newValues = args.data || {};
      recordId = result?.id || args.data?.id;
      break;

    case 'update':
      newValues = args.data || {};
      recordId = args.where?.id || args.where?.userId || result?.id;
      oldValues = null; // Could fetch previous record if needed
      break;

    case 'updateMany':
      newValues = args.data || {};
      recordId = null; // Multiple records
      break;

    case 'delete':
      oldValues = result; // The deleted record
      recordId = result?.id || args.where?.id;
      break;

    case 'deleteMany':
      recordId = null; // Multiple records
      break;
  }

  return { oldValues, newValues, recordId };
}

/**
 * Internal: Log audit event (async, non-blocking)
 */
async function logAuditEvent({ tableName, action, recordId, oldValues, newValues, changedBy }) {
  // This will be called by a separate Prisma client instance
  // to avoid recursion issues
  const { PrismaClient } = require('@prisma/client');
  const auditClient = new PrismaClient();

  try {
    await auditClient.auditLog.create({
      data: {
        tableName,
        action,
        recordId: recordId || 0n, // Default to 0 if null (for batch operations)
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        changedBy,
        changedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[Audit Log] Error writing to audit_log:', error);
  } finally {
    await auditClient.$disconnect();
  }
}

module.exports = { auditLogMiddleware, logAuditEvent };

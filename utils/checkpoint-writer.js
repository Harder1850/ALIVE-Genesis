/**
 * Checkpoint Writer - Autonomous Stability Helper
 * 
 * Prevents empty content blocks from crashing autonomous runs.
 * Validates all checkpoint/response content before write/print operations.
 * 
 * PROBLEM SOLVED:
 * - API error: "messages.N content is empty" due to empty response blocks
 * - Caused by streaming payload issues, not code bugs
 * - This helper ensures content is always non-empty
 */

/**
 * Validates and sanitizes content for safe output
 * @param {string|object} content - Content to validate
 * @param {object} options - Validation options
 * @returns {string} - Safe, non-empty content
 */
function validateContent(content, options = {}) {
    const {
        taskName = 'unknown',
        minLength = 1,
        fallbackPrefix = '[EMPTY CHECKPOINT BLOCK PREVENTED]'
    } = options;
    
    const timestamp = new Date().toISOString();
    
    // Handle null/undefined
    if (content === null || content === undefined) {
        return `${fallbackPrefix} - Task: ${taskName} - Time: ${timestamp} - Reason: null/undefined content`;
    }
    
    // Convert to string if object
    let contentStr = typeof content === 'string' 
        ? content 
        : JSON.stringify(content, null, 2);
    
    // Trim whitespace
    contentStr = contentStr.trim();
    
    // Check if empty or below minimum length
    if (contentStr.length < minLength) {
        return `${fallbackPrefix} - Task: ${taskName} - Time: ${timestamp} - Reason: content length ${contentStr.length} < ${minLength}`;
    }
    
    // Check for common "empty" patterns
    const emptyPatterns = [
        /^null$/i,
        /^undefined$/i,
        /^\{\}$/,
        /^\[\]$/,
        /^""$/,
        /^''$/
    ];
    
    for (const pattern of emptyPatterns) {
        if (pattern.test(contentStr)) {
            return `${fallbackPrefix} - Task: ${taskName} - Time: ${timestamp} - Reason: matched empty pattern ${pattern}`;
        }
    }
    
    // Content is valid
    return contentStr;
}

/**
 * Safe write to stdout (for JSON responses)
 * @param {object} payload - JSON payload to write
 * @param {object} options - Write options
 */
function safeWriteStdout(payload, options = {}) {
    const { taskName = 'stdout', validateResponse = true } = options;
    
    // Validate the payload
    if (!payload || typeof payload !== 'object') {
        payload = {
            ok: false,
            error: 'Invalid payload',
            response: validateContent('', { taskName: 'invalid-payload' }),
            errors: ['Payload must be an object']
        };
    }
    
    // Validate response field if present and validateResponse is true
    if (validateResponse && payload.hasOwnProperty('response')) {
        payload.response = validateContent(payload.response, { 
            taskName,
            minLength: 1
        });
    }
    
    // Validate other text fields
    if (payload.hasOwnProperty('error') && typeof payload.error === 'string') {
        payload.error = validateContent(payload.error, { 
            taskName: `${taskName}-error`,
            minLength: 1
        });
    }
    
    // Convert to JSON
    const jsonStr = JSON.stringify(payload, null, 2);
    
    // Write to stdout
    process.stdout.write(jsonStr + '\n');
}

/**
 * Safe write to file (for checkpoint documents)
 * @param {string} filepath - Path to write to
 * @param {string} content - Content to write
 * @param {object} options - Write options
 */
function safeWriteFile(filepath, content, options = {}) {
    const fs = require('fs');
    const path = require('path');
    
    const { taskName = path.basename(filepath), encoding = 'utf8' } = options;
    
    // Validate content
    const validatedContent = validateContent(content, { 
        taskName,
        minLength: 10 // Files should have at least 10 chars
    });
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filepath, validatedContent, encoding);
    
    return validatedContent;
}

/**
 * Safe console log (for checkpoint messages during autonomous runs)
 * @param {string} message - Message to log
 * @param {object} options - Log options
 */
function safeLog(message, options = {}) {
    const { taskName = 'console', target = 'stdout' } = options;
    
    // Validate message
    const validatedMessage = validateContent(message, { taskName });
    
    // Write to appropriate stream
    if (target === 'stderr') {
        process.stderr.write(validatedMessage + '\n');
    } else {
        process.stdout.write(validatedMessage + '\n');
    }
    
    return validatedMessage;
}

module.exports = {
    validateContent,
    safeWriteStdout,
    safeWriteFile,
    safeLog
};

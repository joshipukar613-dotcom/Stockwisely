/**
 * Middleware to restrict access based on user roles
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 */
const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: No user found' });
        }

        const { role } = req.user;
        
        // ADMIN is a super-role and can access everything
        if (role === 'ADMIN') {
            return next();
        }

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ 
                message: `Forbidden: Access restricted to ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};

module.exports = roleCheck;

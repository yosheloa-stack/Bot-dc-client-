'use strict';

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.redirect('/login');
}

module.exports = requireAdmin;

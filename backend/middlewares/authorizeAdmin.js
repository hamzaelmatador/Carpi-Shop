const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    next(new Error('Access denied. Admins only.'));
  }
};

export default authorizeAdmin;

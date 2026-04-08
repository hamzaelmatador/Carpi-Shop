const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // If status code is 200 but an error reached here, it's a 500 server error
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || err.toString();
  if (message === '[object Object]') {
    message = 'Internal Server Error';
  }

  // Handle Mongoose bad ObjectId error
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Handle Mongoose Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val) => val.message);
    message = errors.join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };

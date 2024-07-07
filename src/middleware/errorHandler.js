const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.status || 500;
  res.status(statusCode).send({ error: 'Internal Server Error' });
};

export default errorHandler;

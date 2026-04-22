/**
 * Global Express error handler.
 * Catches anything thrown inside route handlers (via express-async-errors).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error("[Error]", err.message);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export default errorHandler;

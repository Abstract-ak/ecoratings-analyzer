const logger = (req, res, next) => {
  const start = Date.now();

  // When response finishes
  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`,
    );
  });

  next();
};

export default logger;

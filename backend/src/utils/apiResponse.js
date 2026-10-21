export function sendSuccess(res, { statusCode = 200, message = 'OK', data = null, meta = undefined }) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

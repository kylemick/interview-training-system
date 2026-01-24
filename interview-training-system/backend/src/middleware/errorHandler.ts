import type { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    })
  }

  // 默认错误
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '服务器内部错误',
    },
  })
}

/**
 * AI Loading Hook
 * 用于统一管理AI调用的loading状态，防止用户重复点击或离开页面
 */
import { useState, useCallback, useEffect } from 'react';
import { message, Modal } from 'antd';

interface UseAiLoadingOptions {
  /** Loading提示文本 */
  loadingText?: string;
  /** 成功提示文本 */
  successText?: string;
  /** 是否显示确认对话框（防止误操作） */
  showConfirm?: boolean;
  /** 确认对话框标题 */
  confirmTitle?: string;
  /** 确认对话框内容 */
  confirmContent?: string;
}

/**
 * AI Loading Hook
 * @param options 配置选项
 * @returns { loading, executeWithLoading, cancelLoading }
 */
export function useAiLoading(options: UseAiLoadingOptions = {}) {
  const {
    loadingText = 'AI 正在处理中，请稍候...',
    successText,
    showConfirm = false,
    confirmTitle = '确认操作',
    confirmContent = '此操作可能需要一些时间，确定要继续吗？',
  } = options;

  const [loading, setLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  /**
   * 执行带loading的异步操作
   */
  const executeWithLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      customOptions?: {
        loadingText?: string;
        successText?: string;
        showConfirm?: boolean;
        onSuccess?: (result: T) => void;
        onError?: (error: any) => void;
      }
    ): Promise<T | null> => {
      // 如果已经在loading，直接返回
      if (loading) {
        message.warning('操作正在进行中，请勿重复点击');
        return null;
      }

      // 显示确认对话框
      if (customOptions?.showConfirm ?? showConfirm) {
        return new Promise((resolve) => {
          Modal.confirm({
            title: confirmTitle,
            content: confirmContent,
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
              try {
                setLoading(true);
                const key = `ai-loading-${Date.now()}`;
                setLoadingKey(key);
                message.loading({
                  content: customOptions?.loadingText || loadingText,
                  key,
                  duration: 0, // 不自动关闭
                });

                const result = await asyncFn();

                message.destroy(key);
                if (customOptions?.successText || successText) {
                  message.success({
                    content: customOptions?.successText || successText,
                    key,
                    duration: 2,
                  });
                }

                if (customOptions?.onSuccess) {
                  customOptions.onSuccess(result);
                }

                resolve(result);
              } catch (error: any) {
                message.destroy(loadingKey || '');
                const errorMsg =
                  error?.response?.data?.error?.message ||
                  error?.response?.data?.message ||
                  error?.message ||
                  '操作失败';
                message.error({
                  content: errorMsg,
                  key: loadingKey || 'error',
                  duration: 3,
                });

                if (customOptions?.onError) {
                  customOptions.onError(error);
                }

                resolve(null);
              } finally {
                setLoading(false);
                setLoadingKey(null);
              }
            },
            onCancel: () => {
              resolve(null);
            },
          });
        });
      }

      // 不显示确认对话框，直接执行
      try {
        setLoading(true);
        const key = `ai-loading-${Date.now()}`;
        setLoadingKey(key);
        message.loading({
          content: customOptions?.loadingText || loadingText,
          key,
          duration: 0, // 不自动关闭
        });

        const result = await asyncFn();

        message.destroy(key);
        if (customOptions?.successText || successText) {
          message.success({
            content: customOptions?.successText || successText,
            key,
            duration: 2,
          });
        }

        if (customOptions?.onSuccess) {
          customOptions.onSuccess(result);
        }

        return result;
      } catch (error: any) {
        message.destroy(loadingKey || '');
        const errorMsg =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          '操作失败';
        message.error({
          content: errorMsg,
          key: loadingKey || 'error',
          duration: 3,
        });

        if (customOptions?.onError) {
          customOptions.onError(error);
        }

        return null;
      } finally {
        setLoading(false);
        setLoadingKey(null);
      }
    },
    [loading, loadingKey, loadingText, successText, showConfirm, confirmTitle, confirmContent]
  );

  /**
   * 取消loading（用于清理）
   */
  const cancelLoading = useCallback(() => {
    if (loadingKey) {
      message.destroy(loadingKey);
    }
    setLoading(false);
    setLoadingKey(null);
  }, [loadingKey]);

  // 组件卸载时清理loading
  useEffect(() => {
    return () => {
      if (loadingKey) {
        message.destroy(loadingKey);
      }
    };
  }, [loadingKey]);

  // 页面离开前警告（如果正在loading）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'AI 正在处理中，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  return {
    loading,
    executeWithLoading,
    cancelLoading,
  };
}

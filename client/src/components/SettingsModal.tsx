import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl: string;
  onSave: (url: string) => void;
  onReset: () => void;
}

export function SettingsModal({ isOpen, onClose, serverUrl, onSave, onReset }: SettingsModalProps) {
  const [url, setUrl] = useState(serverUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setUrl(serverUrl);
      setTestStatus('idle');
    }
  }, [isOpen, serverUrl]);

  const handleSave = () => {
    let finalUrl = url.trim();
    // 确保 URL 格式正确
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'http://' + finalUrl;
    }
    onSave(finalUrl);
    onClose();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    try {
      let testUrl = url.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'http://' + testUrl;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${testUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch {
      setTestStatus('error');
    }
  };

  const handleReset = () => {
    onReset();
    setTestStatus('idle');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* 头部 */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">服务器设置</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* 内容 */}
              <div className="p-6 space-y-6">
                {/* 当前连接状态 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">当前服务器:</span>
                    <br />
                    <span className="font-mono text-xs break-all">{serverUrl}</span>
                  </p>
                </div>
                
                {/* 输入框 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    服务器地址
                    <span className="text-xs text-gray-400">(例如: http://localhost:3001)</span>
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setTestStatus('idle');
                    }}
                    placeholder="http://localhost:3001"
                    className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-500">
                    支持 IP 地址或域名，如: http://192.168.1.100:3001 或 https://uno-server.example.com
                  </p>
                </div>
                
                {/* 测试状态 */}
                {testStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">连接成功！服务器可访问</span>
                  </div>
                )}
                
                {testStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">连接失败！请检查地址是否正确</span>
                  </div>
                )}
                
                {/* 按钮组 */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleTest}
                      disabled={testStatus === 'testing' || !url.trim()}
                      className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {testStatus === 'testing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          测试中...
                        </>
                      ) : (
                        '测试连接'
                      )}
                    </button>
                    
                    <button
                      onClick={handleReset}
                      className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="恢复默认"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={!url.trim()}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    保存并应用
                  </button>
                </div>
                
                {/* 提示 */}
                <div className="text-xs text-gray-400 text-center">
                  修改服务器地址后，页面将重新连接
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

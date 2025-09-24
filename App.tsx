import React, { useState } from 'react';
import { Upload, FileText, User, Mail, CheckCircle, AlertCircle, Loader2, MessageSquare, Clock, Plus, Menu, X, Settings, LogOut, History } from 'lucide-react';
import IntegratedChat from './components/IntegratedChat';
import LoginModal from './components/LoginModal';
import UserSettingsModal from './components/UserSettingsModal';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import { useAuth } from './hooks/useAuth';
import { useChatHistory, ChatMessage } from './hooks/useChatHistory';
import { useN8NChatHistory } from './hooks/useN8NChatHistory';

interface FormData {
  firstName: string;
  lastName: string;
  brandName: string;
  email: string;
  file: File | null;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  brandName?: string;
  email?: string;
  file?: string;
}

function App() {
  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
  const { conversations, loadConversationMessages } = useChatHistory();
  const { loadN8NChatHistory, isLoading: isLoadingN8NHistory } = useN8NChatHistory();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    brandName: '',
    email: '',
    file: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [userId] = useState(() => {
    return user?.id || 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  });

  // Update form data when user changes or when upload form opens
  React.useEffect(() => {
    if (user && showUploadForm) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
        brandName: user.brandName,
        email: user.email,
      }));
      // Clear any existing errors when prefilling
      setErrors({});
    }
  }, [user, showUploadForm]);

  const handleLoadAllHistory = async (): Promise<any[]> => {
    if (!user || !isAuthenticated) return [];
    
    try {
      // Load all conversations and their messages
      const allMessages: any[] = [];
      
      for (const conversation of conversations) {
        const messages = await loadConversationMessages(conversation.id);
        // Add conversation separator
        if (allMessages.length > 0) {
          allMessages.push({
            id: `separator-${conversation.id}`,
            content: `--- ${conversation.title} (${conversation.createdAt.toLocaleDateString()}) ---`,
            sender: 'bot' as const,
            timestamp: conversation.createdAt,
          });
        }
        // Add all messages from this conversation
        allMessages.push(...messages.map(msg => ({
          id: `history-${msg.id}`,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp,
          attachments: msg.attachments
        })));
      }
      
      return allMessages;
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  };

  const handleLoadN8NHistory = async (): Promise<any[]> => {
    if (!user || !isAuthenticated) return [];
    
    try {
      const n8nMessages = await loadN8NChatHistory();
      return n8nMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        attachments: msg.attachments
      }));
    } catch (error) {
      console.error('Error loading N8N chat history:', error);
      return [];
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const firstName = user?.firstName || formData.firstName;
    const lastName = user?.lastName || formData.lastName;
    const brandName = user?.brandName || formData.brandName;
    const email = user?.email || formData.email;

    if (!firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!brandName?.trim()) {
      newErrors.brandName = 'Brand name is required';
    }

    if (!email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.file) {
      newErrors.file = 'Please select a PDF file';
    } else if (formData.file.type !== 'application/pdf') {
      newErrors.file = 'Only PDF files are allowed';
    } else if (formData.file.size > 10 * 1024 * 1024) {
      newErrors.file = 'File size must be less than 10MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
    
    if (errors.file) {
      setErrors(prev => ({ ...prev, file: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', user?.firstName || formData.firstName);
      formDataToSend.append('lastName', user?.lastName || formData.lastName);
      formDataToSend.append('brandName', user?.brandName || formData.brandName);
      formDataToSend.append('email', user?.email || formData.email);
      formDataToSend.append('userId', user?.email || formData.email);
      formDataToSend.append('userName', user ? `${user.firstName} ${user.lastName}` : `${formData.firstName} ${formData.lastName}`);
      formDataToSend.append('userBrandName', user?.brandName || formData.brandName);
      formDataToSend.append('data', formData.file!);

      console.log('Sending document upload to:', 'https://iamfashion.app.n8n.cloud/webhook/document-upload');
      console.log('Upload data:', {
        firstName: user?.firstName || formData.firstName,
        lastName: user?.lastName || formData.lastName,
        brandName: user?.brandName || formData.brandName,
        email: user?.email || formData.email,
        userId: user?.id || userId,
        fileName: formData.file!.name,
        fileSize: formData.file!.size
      });

      const response = await fetch('/api/webhook-test/document-upload', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('🎉 Document uploaded successfully! Your file has been processed and is ready for analysis.');
        setFormData({
          firstName: '',
          lastName: '',
          brandName: '',
          email: '',
          file: null,
        });
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Keep the modal open for 3 seconds to show success message, then close
        setTimeout(() => {
          setShowUploadForm(false);
          setSubmitStatus('idle');
          setSubmitMessage('');
        }, 3000);
      } else {
        const responseText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${responseText || response.statusText}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSubmitStatus('error');
      setSubmitMessage(`❌ Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        {isAuthenticated && user ? (
          <>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-pink-500 text-white rounded-lg shadow-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
              <div 
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Left Sidebar */}
            <div className={`
              fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
              w-80 lg:w-96 bg-gradient-to-b from-pink-500 to-pink-600 text-white flex flex-col
              transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            
              {/* Logo */}
              <div className="flex items-center justify-center p-8">
                <img 
                  src="https://kxnyqbyrzepdxucivsbo.supabase.co/storage/v1/object/public/assets/IAM_LOGO%201%20COLOR-01.png" 
                  alt="IAM Fashion Logo" 
                  className="max-h-16 lg:max-h-20 w-auto object-contain"
                />
              </div>

              {/* History Section */}
              <div className="flex-1 px-6 overflow-y-auto min-h-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">History</h2>
                </div>
                
                {/* Retrieve Chat History Button */}
                <div className="mb-6">
                  <button
                    onClick={async () => {
                      try {
                        console.log('Calling retrieve chat history webhook...');
                        const response = await fetch('https://iamfashion.app.n8n.cloud/webhook/511abe15-0332-4bf8-9ed7-bc718465191c', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userId: user?.id,
                            email: user?.email,
                            timestamp: new Date().toISOString()
                          }),
                        });
                        
                        if (response.ok) {
                          // Read response as text first
                          const responseText = await response.text();
                          console.log('Raw webhook response:', responseText);
                          
                          let messages = [];
                          
                          try {
                            // Try to parse as JSON
                            const parsedResult = JSON.parse(responseText);
                            console.log('Parsed JSON response:', parsedResult);
                            
                            // Extract messages from various possible structures
                            if (Array.isArray(parsedResult)) {
                              messages = parsedResult;
                            } else if (parsedResult && typeof parsedResult === 'object') {
                              // Try different possible field names for message arrays
                              messages = parsedResult.messages || 
                                       parsedResult.data || 
                                       parsedResult.history || 
                                       parsedResult.chat_history || 
                                       parsedResult.conversations || 
                                       parsedResult.items ||
                                       [];
                              
                              // If still no messages found, check if the object itself is a message
                              if (messages.length === 0 && (parsedResult.content || parsedResult.message || parsedResult.text)) {
                                messages = [parsedResult];
                              }
                            }
                          } catch (parseError) {
                            console.log('Response is not JSON, treating as text message');
                            // If it's not JSON, treat the entire response as a single message
                            if (responseText.trim()) {
                              messages = [{
                                content: responseText.trim(),
                                sender: 'bot',
                                timestamp: new Date().toISOString()
                              }];
                            }
                          }
                          
                          console.log('Extracted messages:', messages);
                          
                          // Dispatch custom event to the chat component
                          const event = new CustomEvent('loadWebhookHistory', {
                            detail: messages
                          });
                          window.dispatchEvent(event);
                          
                        } else {
                          console.error('Failed to retrieve chat history:', response.status, response.statusText);
                          
                          // Show error message in chat
                          const errorEvent = new CustomEvent('loadWebhookHistory', {
                            detail: [{
                              content: `Failed to retrieve chat history: ${response.status} ${response.statusText}`,
                              sender: 'bot',
                              timestamp: new Date().toISOString()
                            }]
                          });
                          window.dispatchEvent(errorEvent);
                        }
                      } catch (error) {
                        console.error('Error calling retrieve chat history webhook:', error);
                        
                        // Show error message in chat
                        const errorEvent = new CustomEvent('loadWebhookHistory', {
                          detail: [{
                            content: `Error retrieving chat history: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            sender: 'bot',
                            timestamp: new Date().toISOString()
                          }]
                        });
                        window.dispatchEvent(errorEvent);
                      }
                    }}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <History className="w-5 h-5" />
                    <span>Retrieve Chat History</span>
                  </button>
                </div>
                
                {conversations.length > 0 ? (
                  <div className="space-y-3">
                    {conversations.map((chat) => (
                      <div
                        key={chat.id}
                        className="w-full text-left p-4 bg-white/10 rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {chat.title}
                            </h3>
                            <div className="flex items-center mt-2 text-white/70 text-sm">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{formatTime(chat.updatedAt)}</span>
                              <span className="mx-2">-</span>
                              <MessageSquare className="w-4 h-4 mr-1" />
                              <span>{chat.messageCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No chat history yet</p>
                    <p className="text-xs mt-1">Start a conversation to see your history here</p>
                  </div>
                )}
              </div>

            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Header */}
              <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="lg:hidden w-10"></div> {/* Spacer for mobile menu button */}
                  <h1 className="text-2xl lg:text-4xl font-bold text-[#0EA5E9]">Brand Challenger</h1>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 px-4 py-2 bg-[#0EA5E9] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm lg:text-base"
                  >
                    <div className="text-right hidden sm:block">
                      <div className="font-semibold">{user.brandName}</div>
                      <div className="text-xs text-blue-100">{user.firstName} {user.lastName}</div>
                    </div>
                    <div className="w-8 h-8 bg-white text-[#0EA5E9] rounded-full flex items-center justify-center font-bold">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setShowSettingsModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-hidden">
                <div className="p-4 lg:p-8 h-full">
                  <div className="max-w-4xl mx-auto h-full">
                    <IntegratedChat 
                      userId={user?.id || userId} 
                      userName={user ? `${user.firstName} ${user.lastName}` : undefined}
                      brandName={user?.brandName}
                      onLoadHistory={handleLoadAllHistory}
                      onLoadN8NHistory={handleLoadN8NHistory}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Login Screen - 50/50 Split */
          <div className="min-h-screen flex w-full">
            {/* Left Side - Pink with Logo */}
            <div className="w-1/2 bg-gradient-to-b from-pink-500 to-pink-600 flex items-center justify-center">
              < img
                src="https://kxnyqbyrzepdxucivsbo.supabase.co/storage/v1/object/public/assets/IAM_LOGO%201%20COLOR-01.png" 
                alt="IAM Fashion Logo" 
                className="max-h-12 md:max-h-14 lg:max-h-16 w-auto object-contain"
              />
            </div>
            
            {/* Right Side - White with Login Form */}
            <div className="w-1/2 bg-white flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-12 w-full max-w-md">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Login</h1>
                </div>
                
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('email') as string;
                  const password = formData.get('password') as string;
                  
                  if (email && password) {
                    const result = await login({ email, password });
                    if (!result.success && result.error) {
                      alert(result.error);
                    }
                  }
                }}>
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      User email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="user@example.com"
                      className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-[#0EA5E9] text-white py-4 px-6 rounded-xl font-semibold text-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        'Login'
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Forgot Password Link */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm text-gray-600 hover:text-[#0EA5E9] transition-colors underline"
                  >
                    Forgot password?
                  </button>
                </div>
                
                {/* Sign Up Option */}
                <div className="mt-8 text-center">
                  <p className="text-lg text-gray-600 mb-4">
                    Do not have an account?
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    className="text-[#0EA5E9] hover:text-blue-600 font-medium text-lg underline transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      {/* User Settings Modal */}
      <UserSettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPasswordModal} 
        onClose={() => setShowForgotPasswordModal(false)} 
      />

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <div className="text-green-800 font-semibold">Upload Successful!</div>
                    <div className="text-green-700 text-sm mt-1">{submitMessage}</div>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <div>
                    <div className="text-red-800 font-semibold">Upload Failed</div>
                    <div className="text-red-700 text-sm mt-1">{submitMessage}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={user?.firstName || formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200 ${
                        errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="Enter your first name"
                      disabled={!!user}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={user?.lastName || formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200 ${
                        errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="Enter your last name"
                      disabled={!!user}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.lastName}
                    </p>
                  )}
                </div>

                {/* Brand Name */}
                <div>
                  <label htmlFor="brandName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="brandName"
                      name="brandName"
                      value={user?.brandName || formData.brandName}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200 ${
                        errors.brandName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="Enter your brand name"
                      disabled={!!user}
                    />
                  </div>
                  {errors.brandName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.brandName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={user?.email || formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all duration-200 ${
                        errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="Enter your email address"
                      disabled={!!user}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-semibold text-gray-700 mb-2">
                    PDF Document
                  </label>
                  <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
                    errors.file ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-[#0EA5E9] hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0EA5E9]"
                        >
                          <span>Upload a PDF file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">PDF up to 10MB</p>
                    </div>
                    {formData.file && (
                      <div className="mt-4 flex items-center justify-center p-2 bg-blue-50 rounded-lg">
                        <FileText className="h-5 w-5 text-[#0EA5E9] mr-2" />
                        <div className="text-sm text-blue-700">
                          <div className="font-medium">{formData.file.name}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            Size: {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.file && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.file}
                    </p>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#0EA5E9] text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Upload Document
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default App;
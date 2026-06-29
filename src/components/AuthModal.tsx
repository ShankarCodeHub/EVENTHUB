import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, User as UserIcon, Shield, Sparkles, LogIn, Key, 
  HelpCircle, Lock, UserCheck, Smartphone, ArrowLeft, 
  CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { login, register, resetPassword, sendResetCode } = useAuth();
  
  // Navigation view: signin, register, forgot_request, forgot_verify, twofactor
  const [view, setView] = useState<'signin' | 'register' | 'forgot_request' | 'forgot_verify' | 'twofactor'>('signin');
  
  // General UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sign-in state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('attendee');
  const [reg2FA, setReg2FA] = useState(false);

  // Forgot password state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // 2FA login state
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg("Please enter both credentials.");
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword.trim());
      if (res.success) {
        if (res.requires2FA) {
          // Switch to 2FA verification screen
          setView('twofactor');
          setSuccessMsg("2-Step Verification requested! Enter the verification code dispatched to your account.");
        } else {
          onSuccess("Welcome back! Successfully authenticated.");
          onClose();
        }
      } else {
        setErrorMsg(res.error || "Authentication failed.");
      }
    } catch (err) {
      setErrorMsg("An unexpected system error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    if (regUsername.trim().includes(' ')) {
      setErrorMsg("Username cannot contain spaces.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await register({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword.trim(),
        role: regRole,
        twoFactorEnabled: reg2FA
      });

      if (res.success) {
        onSuccess(`Account created successfully! Welcoming you as a ${regRole}.`);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to create account.");
      }
    } catch (err) {
      setErrorMsg("An unexpected registration error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setErrorMsg("Please enter your registered Email or Username.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await sendResetCode(resetIdentifier.trim());
      if (res.success) {
        setSuccessMsg(`Reset verification code sent! Check your Notifications center (top right icon) to view the code.`);
        setView('forgot_verify');
      } else {
        setErrorMsg(res.error || "Unable to process password reset request.");
      }
    } catch (err) {
      setErrorMsg("An error occurred dispatching verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !resetNewPassword.trim()) {
      setErrorMsg("Please enter both the security code and new password.");
      return;
    }

    if (resetNewPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await resetPassword(resetIdentifier.trim(), resetNewPassword.trim(), resetCode.trim());
      if (res.success) {
        onSuccess("Password changed successfully! You can now sign in.");
        setSuccessMsg("Password successfully updated. Please sign in.");
        setView('signin');
        setLoginIdentifier(resetIdentifier);
        setLoginPassword('');
        setResetCode('');
        setResetNewPassword('');
      } else {
        setErrorMsg(res.error || "Incorrect or expired code.");
      }
    } catch (err) {
      setErrorMsg("Error completing password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword.trim(), twoFactorCode.trim());
      if (res.success) {
        onSuccess("2-Step Verification passed! Welcome back.");
        onClose();
      } else {
        setErrorMsg(res.error || "Verification code is incorrect.");
      }
    } catch (err) {
      setErrorMsg("Verification failure occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (email: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await login(email, 'password123');
      if (res.success) {
        if (res.requires2FA) {
          setView('twofactor');
          setLoginIdentifier(email);
          setLoginPassword('password123');
          setSuccessMsg("Demo profile requires 2-Step Verification! Retrieve code from Notifications center.");
        } else {
          onSuccess("Demo profile authenticated successfully.");
          onClose();
        }
      } else {
        setErrorMsg(res.error || "Demo login failed.");
      }
    } catch (err) {
      setErrorMsg("Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass rounded-3xl shadow-2xl border border-white/10 max-w-lg w-full overflow-hidden relative"
      >
        {/* Dynamic header depending on view */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
              {view === 'signin' && <LogIn className="w-5 h-5" />}
              {view === 'register' && <UserCheck className="w-5 h-5" />}
              {view === 'forgot_request' && <Key className="w-5 h-5" />}
              {view === 'forgot_verify' && <Shield className="w-5 h-5" />}
              {view === 'twofactor' && <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                {view === 'signin' && "Secure Gateway"}
                {view === 'register' && "Create Account"}
                {view === 'forgot_request' && "Password Recovery"}
                {view === 'forgot_verify' && "Enter Recovery Code"}
                {view === 'twofactor' && "2-Step Verification"}
              </h3>
              <p className="text-xs text-slate-400">
                {view === 'signin' && "Access your premium event workspace"}
                {view === 'register' && "Join the decentralized global event hub"}
                {view === 'forgot_request' && "Recover access to your profile securely"}
                {view === 'forgot_verify' && "Verify security token to set new password"}
                {view === 'twofactor' && "Extra layer of security keeping accounts safe"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info alerts/toasts inside card */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mx-6 mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* 1. SIGN IN VIEW */}
            {view === 'signin' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Navigation Tabs */}
                <div className="flex border-b border-white/10 bg-white/5 p-1 rounded-2xl mb-2">
                  <button
                    onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all bg-white/10 shadow-sm text-primary"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                  <button
                    onClick={() => { setView('register'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-slate-200"
                  >
                    <UserIcon className="w-4 h-4" />
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Username or Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="your_username or yourname@domain.com"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setView('forgot_request'); setErrorMsg(null); setSuccessMsg(null); }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? "Verifying Profile..." : "Sign In & Authenticate"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 2. REGISTER VIEW */}
            {view === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Navigation Tabs */}
                <div className="flex border-b border-white/10 bg-white/5 p-1 rounded-2xl mb-2">
                  <button
                    onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-slate-400 hover:text-slate-200"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                  <button
                    onClick={() => { setView('register'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all bg-white/10 shadow-sm text-primary"
                  >
                    <UserIcon className="w-4 h-4" />
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* First and Last Name Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Username
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="johndoe12"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-10 pr-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="john@doe.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-10 pr-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="•••••••• (min 6 characters)"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Choose Your EventHub Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegRole('attendee')}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                          regRole === 'attendee'
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <UserIcon className="w-4 h-4" />
                        Attendee (Buy & Attend)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('organizer')}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                          regRole === 'organizer'
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Organizer (Create & Host)
                      </button>
                    </div>
                  </div>

                  {/* 2FA Toggle Checkbox */}
                  <div className="p-3.5 bg-indigo-950/20 border border-white/10 rounded-2xl flex items-start gap-3">
                    <div className="flex items-center h-5">
                      <input
                        id="reg-2fa"
                        type="checkbox"
                        checked={reg2FA}
                        onChange={(e) => setReg2FA(e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/30 text-xs"
                      />
                    </div>
                    <label htmlFor="reg-2fa" className="text-xs cursor-pointer select-none">
                      <span className="block font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        Enable 2-Step Verification
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Enhance account security. Requires a 6-digit one-time access token on every login sign-in try.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? "Registering Profile..." : "Register & Sign In"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 3. FORGOT PASSWORD REQUEST VIEW */}
            {view === 'forgot_request' && (
              <motion.div
                key="forgot_request"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <button
                  onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>

                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Account Username or Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Enter email address or username"
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      We will verify your profile and generate a password recovery verification token. This token will instantly display inside your in-app Notifications center.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? "Verifying..." : "Generate Recovery Code"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 4. FORGOT PASSWORD VERIFY VIEW */}
            {view === 'forgot_verify' && (
              <motion.div
                key="forgot_verify"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => { setView('forgot_request'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Resend Code
                  </button>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded-md">
                    Recovery Token Sent
                  </span>
                </div>

                <form onSubmit={handleVerifyReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Enter 6-digit code (e.g. 123456)"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all font-mono"
                      />
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-[10.5px] leading-relaxed">
                      💡 <strong>Simulation Helper:</strong> Check the **Notifications** panel (bell icon, top-right) to view your reset security code, or enter backup code <strong>123456</strong> for testing!
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="•••••••• (min 6 characters)"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? "Updating Password..." : "Reset Password & Sign In"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* 5. TWO-FACTOR AUTHENTICATION VIEW */}
            {view === 'twofactor' && (
              <motion.div
                key="twofactor"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <button
                  onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>

                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      6-Digit Security Token
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Enter token (e.g. 123456)"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder-slate-500 transition-all font-mono"
                      />
                    </div>
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-[10.5px] leading-relaxed">
                      🔒 <strong>2FA Guard Active:</strong> A login verification code was sent to your EventHub account! Open the **Notifications** panel (bell icon, top-right) to view the code, or use backup code <strong>123456</strong> to test!
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? "Verifying Access Code..." : "Verify & Complete Login"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Demo Access Footer */}
          {view === 'signin' && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-3 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick demo logins (Default password: <strong>password123</strong>):</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('attendee@eventhub.com')}
                  className="bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-200 px-2.5 py-2.5 rounded-xl text-center transition-all font-bold truncate"
                >
                  Attendee Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('organizer@eventhub.com')}
                  className="bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-slate-300 hover:text-purple-200 px-2.5 py-2.5 rounded-xl text-center transition-all font-bold truncate"
                >
                  Organizer Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin@eventhub.com')}
                  className="bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-slate-300 hover:text-rose-200 px-2.5 py-2.5 rounded-xl text-center transition-all font-bold truncate"
                >
                  Admin Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

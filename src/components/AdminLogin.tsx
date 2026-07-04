import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Wifi, Lock, Mail, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!email || (!isReset && !password)) {
      setError('Tafadhali jaza taarifa zote / Please fill in all fields.');
      setIsLoading(false);
      return;
    }

    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email);
        setMessage('Barua pepe ya kuweka upya nenosiri imetumwa! / Password reset email sent!');
      } else if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Manenosiri hayafanani! / Passwords do not match!');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Nenosiri lazima liwe na herufi 6 au zaidi / Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Akaunti imeundwa kikamilifu! / Account created successfully!');
        onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      }
    } catch (err: any) {
      console.warn("Auth error:", err);
      let localizedError = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        localizedError = 'Barua pepe au Nenosiri sio sahihi / Invalid Email or Password.';
      } else if (err.code === 'auth/email-already-in-use') {
        localizedError = 'Barua pepe hii tayari inatumika / This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        localizedError = 'Nenosiri ni dhaifu sana / Password is too weak.';
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = 'Njia ya "Email/Password" haijawashwa kwenye Firebase Console! Tafadhali fungua Firebase Console, nenda kwenye Authentication -> Sign-in method, na uwashe "Email/Password" ili kuweza kusajili au kuingia. / Email/Password sign-in method is disabled in the Firebase Console. Please go to Firebase Console -> Authentication -> Sign-in method, and enable "Email/Password" to sign up or log in.';
      }
      setError(localizedError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8" id="admin-login-card">
      {/* Top Banner */}
      <div className="bg-red-600 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-700 rounded-full translate-x-12 -translate-y-12 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500 rounded-full -translate-x-8 translate-y-8 opacity-30"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="font-display font-extrabold text-xl tracking-tight">
            {isReset ? 'Rudisha Nenosiri' : isSignUp ? 'Sajili Akaunti mpya' : 'Ingia kwenye Mfumo'}
          </h2>
          <p className="text-[11px] text-red-100 font-medium uppercase tracking-wider mt-1">
            {isReset ? 'Password Recovery' : isSignUp ? 'Operator Registration' : 'Hotspot Operator Console'}
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-medium" id="login-error-alert">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3.5 bg-green-50 border border-green-100 text-green-800 rounded-xl text-xs font-medium" id="login-message-alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Barua Pepe / Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@airtel.co.tz"
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all text-gray-800 font-medium"
              />
            </div>
          </div>

          {!isReset && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Nenosiri / Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all text-gray-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Thibitisha Nenosiri / Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all text-gray-800 font-medium"
                />
              </div>
            </div>
          )}

          {!isSignUp && !isReset && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setIsReset(true); setError(null); setMessage(null); }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
              >
                Umesahau Nenosiri? / Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Inapakia... / Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {isReset ? 'Tuma Barua Pepe / Send Email' : isSignUp ? 'Sajili / Register Operator' : 'Ingia / Sign In'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Auth Mode Toggles */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-500 space-y-2">
          {isReset ? (
            <button
              onClick={() => { setIsReset(false); setError(null); setMessage(null); }}
              className="font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Rudi kwenye Kuingia / Return to Login
            </button>
          ) : (
            <p>
              {isSignUp ? "Tayari una akaunti?" : "Huna akaunti ya Operator bado?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
                className="font-bold text-red-600 hover:text-red-700 cursor-pointer inline-block"
              >
                {isSignUp ? 'Ingia Sasa / Sign In Here' : 'Sajili Sasa / Register One Here'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

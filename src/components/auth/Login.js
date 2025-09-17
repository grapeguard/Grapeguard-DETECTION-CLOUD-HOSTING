// Multilingual Login.js
// src/components/auth/Login.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setPersistence, browserLocalPersistence, browserSessionPersistence} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import GoogleLogo from '../../assets/google.png';
import FarmImage from '../../assets/bg.jpg';


import {
  FormControlLabel,
  Checkbox,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  //Agriculture as AgricultureIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Starting login process...');
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      await login(formData.email, formData.password);

      console.log('🎉 Login completed, redirecting...');
      
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        navigate('/');
      }, 500);
      
    } catch (error) {
      console.error('💥 Login failed:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left Side Image */}
      <div style={{
        flex: '0 0 60%',
        backgroundImage: `url(${FarmImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }} />

      {/* Right Side Login Form */}
      <div style={{
        flex: '0 0 40%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #faf5ff, #f0fdf4)'
      }}>

      {/* Language Switcher */}
      <Box position="absolute" top={16} right={16}>
        <LanguageSwitcher variant="compact" />
      </Box>

      <Container maxWidth="sm">
        <Paper elevation={8} style={{ padding: '2rem', borderRadius: '1rem' }}>
          <Box textAlign="center" mb={4}>
            {/* <div style={{
              background: 'linear-gradient(to right, #8b5cf6, #22c55e)',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <AgricultureIcon style={{ color: 'white', fontSize: '1.5rem' }} />
            </div> */}
            <div style={{
              background: 'white',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '2px solid #22c55e'
            }}>
              <img
                src="/favicon-32x32.png"
                alt="GrapeGuard"
                style={{ width: '60%', height: '60%' }}
              />
            </div>

            <Typography variant="h4" component="h1" className="font-bold text-gray-800 mb-2">
              GrapeGuard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {t('welcomeBack')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" style={{ marginBottom: '1rem' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <TextField
                fullWidth
                label={t('emailAddress')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box mb={3}>
              <TextField
                fullWidth
                label={t('password')}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    color="primary"
                  />
                }
                label={t('rememberMe')}
              />
              <Typography
                variant="body2"
                color="primary"
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setShowResetForm(true)}
              >
                {t('forgotPassword')}
              </Typography>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              style={{
                padding: '0.75rem',
                marginTop: '1.5rem',
                background: 'linear-gradient(to right, #8b5cf6, #22c55e)',
                color: 'white'
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('signIn')
              )}
            </Button>

            <Box
              display="flex"
              alignItems="center"
              my={3}
            >
              <Box flex={1} height="1px" bgcolor="#ccc" />
              <Typography variant="body2" px={2} color="textSecondary">
                {t('or')}
              </Typography>
              <Box flex={1} height="1px" bgcolor="#ccc" />
            </Box>

          </form>

          {showResetForm && (
            <Box mt={3} mb={2}>
              <Typography variant="h6">{t('resetPassword')}</Typography>

              {resetError && (
                <Alert severity="error" style={{ marginTop: '1rem' }}>
                  {resetError}
                </Alert>
              )}
              {resetMessage && (
                <Alert severity="success" style={{ marginTop: '1rem' }}>
                  {resetMessage}
                </Alert>
              )}

              <TextField
                fullWidth
                margin="normal"
                label={t('enterEmail')}
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />

              <Box display="flex" gap={2} mt={1}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    setResetError('');
                    setResetMessage('');
                    try {
                      await sendPasswordResetEmail(auth, resetEmail);
                      setResetMessage('Reset email sent successfully!');
                    } catch (err) {
                      setResetError('Failed to send reset email.');
                    }
                  }}
                  style={{
                    background: 'linear-gradient(to right, #8b5cf6, #22c55e)',
                    color: 'white'
                  }}
                >
                  {t('sendResetLink')}
                </Button>
                <Button onClick={() => setShowResetForm(false)}>{t('cancel')}</Button>
              </Box>
            </Box>
          )}

          {/* <Button
            onClick={async () => {
              try {
                await loginWithGoogle();
                navigate('/');
              } catch (e) {
                  console.error('Google Sign-In error:', e);
                  setError(e.message || 'Google Sign-in failed');
              }
            }}
            fullWidth
            variant="outlined"
            style={{ marginTop: '1rem', color: '#555' }}
          >
            {t('signInWithGoogle')}
          </Button> */}
          <Button
            onClick={async () => {
              try {
                await loginWithGoogle();
                navigate('/');
              } catch (e) {
                console.error('Google Sign-In error:', e);
                setError(e.message || t('googleSignInFailed'));
              }
            }}
            fullWidth
            variant="outlined"
            style={{
              marginTop: '1rem',
              color: '#555',
              textTransform: 'none',
              fontWeight: 500,
              borderColor: '#ccc'
            }}
            startIcon={
              <img
                src={GoogleLogo}
                alt="Google"
                style={{ width: 20, height: 20 }}
              />
            }
          >
            {t('signInWithGoogle')}
          </Button>

          <Box textAlign="center" mt={4}>
            <Typography variant="body2" color="textSecondary">
              {t('dontHaveAccount')}{' '}
              <Link
                to="/register"
                style={{ color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}
              >
                {t('signUpHere')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </div>
    </div>
  );

}


import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, authDatabase } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Real Firebase login
  async function login(email, password) {
    try {
      console.log('🔑 Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful');
      
      // Wait a bit for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return userCredential.user;
    } catch (error) {
      console.error('❌ Login error:', error.code, error.message);
      
      let errorMessage = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = `Login failed: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save to database if new
      const userRef = ref(authDatabase, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        const profile = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || 'Google User',
          farmName: 'My Farm',
          createdAt: new Date().toISOString(),
          role: 'farmer'
        };
        await set(userRef, profile);
      }

      console.log('✅ Google sign-in successful');
      return user;
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  }


  // Real Firebase registration
  async function register(email, password, userData) {
    try {
      console.log('📝 Attempting registration for:', email);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, {
        displayName: userData.fullName
      });
      
      // Save profile to AUTH database
      const userProfile = {
        uid: user.uid,
        email: email,
        fullName: userData.fullName,
        farmName: userData.farmName,
        phoneNumber: userData.phoneNumber || '',
        location: userData.location || '',
        createdAt: new Date().toISOString(),
        role: 'farmer'
      };
      
      const userRef = ref(authDatabase, `users/${user.uid}`);
      await set(userRef, userProfile);
      
      console.log('✅ Registration successful');
      return user;
    } catch (error) {
      console.error('❌ Registration error:', error.code);
      
      let errorMessage = 'Registration failed. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email registration is not enabled. Please contact support.';
          break;
        default:
          errorMessage = `Login failed: ${error.message}`;

      }
      
      throw new Error(errorMessage);
    }
  }

  // Fetch user profile from AUTH database
  async function fetchUserProfile(uid) {
    try {
      const userRef = ref(authDatabase, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const profile = snapshot.val();
        console.log('✅ Profile loaded');
        setUserProfile(profile);
        return profile;
      } else {
        // Create basic profile if doesn't exist
        const basicProfile = {
          uid: uid,
          email: auth.currentUser?.email || '',
          fullName: auth.currentUser?.displayName || 'User',
          farmName: 'My Farm',
          createdAt: new Date().toISOString(),
          role: 'farmer'
        };
        
        const userRef = ref(authDatabase, `users/${uid}`);
        await set(userRef, basicProfile);
        setUserProfile(basicProfile);
        return basicProfile;
      }
    } catch (error) {
      console.error('❌ Profile fetch error:', error);
      return null;
    }
  }

  // Firebase logout
  async function logout() {
    try {
      await signOut(auth);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const updatedProfile = {
        ...userProfile,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const userRef = ref(authDatabase, `users/${currentUser.uid}`);
      await set(userRef, updatedProfile);
      
      setUserProfile(updatedProfile);
      console.log('✅ Profile updated');
      return updatedProfile;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state:', user ? 'Logged in' : 'Logged out');
      
      if (user) {
        setCurrentUser(user);
        await fetchUserProfile(user.uid);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    register,
    login,
    logout,
    updateUserProfile,
    loading,
    loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

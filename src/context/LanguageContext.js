// Updated LanguageContext.js - Modular Language Files
// src/context/LanguageContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { englishTranslations } from '../translations/english';
import { hindiTranslations } from '../translations/hindi';
import { marathiTranslations } from '../translations/marathi';

const translations = {
  english: englishTranslations,
  hindi: hindiTranslations,
  marathi: marathiTranslations
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('english');

  // Load saved language from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('grapeGuardSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.language && translations[settings.language]) {
          setLanguage(settings.language);
        }
      } catch (error) {
        console.error('Error loading language settings:', error);
      }
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSettings = localStorage.getItem('grapeGuardSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          if (settings.language && translations[settings.language]) {
            setLanguage(settings.language);
          }
        } catch (error) {
          console.error('Error parsing language settings:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Number formatting functions
  const convertToDevanagariNumerals = (numberString) => {
    const devanagariNumbers = {
      '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
      '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
    };
    
    return numberString.replace(/\d/g, digit => devanagariNumbers[digit] || digit);
  };

  const formatNumber = (number, decimals = 2) => {
    if (typeof number !== 'number') return number;
    
    const formatted = number.toFixed(decimals);
    
    // Convert to local numerals if Hindi/Marathi
    if (language === 'hindi' || language === 'marathi') {
      return convertToDevanagariNumerals(formatted);
    }
    
    return formatted;
  };

  // Format large numbers with Indian numbering system
  const formatLargeNumber = (number, decimals = 2) => {
    if (typeof number !== 'number') return number;
    
    if (language === 'hindi' || language === 'marathi') {
      // Indian numbering system: 1,23,45,678
      const formatted = new Intl.NumberFormat('hi-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(number);
      
      return convertToDevanagariNumerals(formatted);
    }
    
    // International format for English
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  };

  // Special formatting for sensor values
  const formatSensorValue = (value, decimals = 2) => {
    if (typeof value !== 'number') return value;
    
    // For very small numbers (like 0.02441), show more decimals
    if (Math.abs(value) < 1 && Math.abs(value) > 0) {
      decimals = 5;
    }
    
    return formatNumber(value, decimals);
  };

  // Format percentage values
  const formatPercentage = (value) => {
    return formatSensorValue(value, 2);
  };

  // Format temperature values
  const formatTemperature = (value) => {
    return formatSensorValue(value, 2);
  };

  // Format voltage values
  const formatVoltage = (value) => {
    return formatSensorValue(value, 2);
  };

  // Format time-related text with proper translation
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return t('time') + ': Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return `${formatSensorValue(diffMins, 0)}m ${t('ago')}`;
    return time.toLocaleTimeString();
  };

  // Get severity label in current language
  const getSeverityLabel = (severity) => {
    const severityMap = {
      'High': t('high'),
      'Medium': t('medium'),
      'Low': t('low'),
      'None': t('none'),
      'Unknown': t('unknown')
    };
    
    return severityMap[severity] || severity;
  };

  // Get treatment recommendations in current language
  const getTreatmentRecommendations = (disease) => {
    const recommendationsMap = {
      'Karpa (Anthracnose)': [
        t('removeInfectedLeaves'),
        t('sprayChlorothalonil'),
        t('improveAirCirculation'),
        t('avoidOverheadIrrigation')
      ],
      'Bhuri (Powdery Mildew)': [
        t('applyPreventiveFungicide'),
        t('improveAirCirculation'),
        t('avoidOverheadIrrigation'),
        t('monitorWeatherConditions')
      ],
      'Bokadlela (Borer Infestation)': [
        t('removeInfectedLeaves'),
        t('keepVineyardClean'),
        t('monitorWeatherConditions'),
        t('maintainProperIrrigation')
      ],
      'Davnya (Downy Mildew)': [
        t('applyCopperFungicide'),
        t('improveAirCirculation'),
        t('avoidOverheadIrrigation'),
        t('removeInfectedLeaves')
      ],
      'Healthy': [
        t('maintainProperIrrigation'),
        t('ensureBalancedNutrition'),
        t('keepVineyardClean'),
        t('monitorWeatherConditions')
      ]
    };
    
    return recommendationsMap[disease] || [
      t('maintainProperIrrigation'),
      t('applyPreventiveFungicide'),
      t('ensureBalancedNutrition'),
      t('monitorWeatherConditions')
    ];
  };

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] || translations['english']?.[key] || key;
  };

  // Change language function
  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      
      // Update localStorage
      const currentSettings = JSON.parse(localStorage.getItem('grapeGuardSettings') || '{}');
      const newSettings = { ...currentSettings, language: newLanguage };
      localStorage.setItem('grapeGuardSettings', JSON.stringify(newSettings));
      
      console.log('Language changed to:', newLanguage);
    }
  };

  const value = {
    language,
    setLanguage: changeLanguage,
    t,
    formatNumber,
    formatLargeNumber,
    formatSensorValue,
    formatPercentage,
    formatTemperature,
    formatVoltage,
    formatTimeAgo,
    getSeverityLabel,
    getTreatmentRecommendations,
    convertToDevanagariNumerals,
    availableLanguages: [
      { code: 'english', name: 'English', nativeName: 'English' },
      { code: 'hindi', name: 'Hindi', nativeName: 'हिंदी' },
      { code: 'marathi', name: 'Marathi', nativeName: 'मराठी' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
};

export default LanguageContext;
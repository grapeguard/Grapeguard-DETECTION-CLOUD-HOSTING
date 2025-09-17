// src/components/LanguageSwitcher.js
import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box, 
  Typography,
  Paper
} from '@mui/material';
import { useTranslation } from '../context/LanguageContext';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSwitcher = ({ variant = 'full' }) => {
  const { language, setLanguage, t, availableLanguages } = useTranslation();

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  // Compact version for header/navigation
  if (variant === 'compact') {
    return (
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={language}
          onChange={handleLanguageChange}
          displayEmpty
          sx={{ 
            '& .MuiSelect-select': { 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }
          }}
        >
          {availableLanguages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LanguageIcon fontSize="small" />
                {lang.nativeName}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Full version for settings page
  return (
    <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <LanguageIcon color="primary" />
        <Typography variant="h6" component="h3">
          {t('language')}
        </Typography>
      </Box>
      
      <FormControl fullWidth>
        <InputLabel id="language-select-label">
          {t('selectLanguage')}
        </InputLabel>
        <Select
          labelId="language-select-label"
          value={language}
          label={t('selectLanguage')}
          onChange={handleLanguageChange}
        >
          {availableLanguages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{lang.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {lang.nativeName}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Language preference will be saved automatically
      </Typography>
    </Paper>
  );
};

export default LanguageSwitcher;
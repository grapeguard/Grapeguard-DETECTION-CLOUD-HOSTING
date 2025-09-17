// Fixed Settings Component with Translation Support
// src/components/settings/Settings.js

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert
} from '@mui/material';
import {
  Language as LanguageIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext'; // Fixed import path

export default function Settings() {
  const { t, language, setLanguage, availableLanguages } = useTranslation(); // Use translation hook
  const [saved, setSaved] = useState(false);

  const handleLanguageChange = (newLanguage) => {
    console.log('Changing language to:', newLanguage); // Debug log
    setLanguage(newLanguage); // This should trigger the context update
  };

  const handleSave = () => {
    // Settings are auto-saved when language changes, so just show confirmation
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  console.log('Current language in Settings:', language); // Debug log

  return (
    <div style={{ padding: '0', backgroundColor: '#f8fafc' }}>
      {saved && (
        <Alert severity="success" style={{ marginBottom: '2rem' }}>
          {t('settingsSavedSuccessfully')}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={2} style={{ backgroundColor: 'white', borderRadius: '12px', border: '2px solid #22c55e' }}>
            <CardContent style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <LanguageIcon style={{ color: '#22c55e', marginRight: '0.75rem', fontSize: '1.5rem' }} />
                <Typography variant="h6" style={{ fontWeight: 600, color: '#1f2937' }}>
                  {t('languageSettings')}
                </Typography>
              </div>
              
              <FormControl fullWidth style={{ marginBottom: '1rem' }}>
                <InputLabel>{t('selectLanguage')}</InputLabel>
                <Select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  label={t('selectLanguage')}
                >
                  {availableLanguages.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{lang.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                          {lang.nativeName}
                        </span>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '1.5rem' }}>
                {t('choosePreferredLanguage')}
              </Typography>

              <Button
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                style={{ backgroundColor: '#22c55e', color: 'white' }}
                fullWidth
              >
                {t('saveSettings')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
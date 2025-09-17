// Multilingual Help.js
// src/components/Help.js

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Agriculture as AgricultureIcon,
  BugReport as BugReportIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from '../context/LanguageContext';

export default function Help() {
  const { t, formatSensorValue } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState(t('gettingStarted'));

  const handleCategoryChange = (category) => {
    setExpandedCategory(expandedCategory === category ? '' : category);
  };

  // Dynamic FAQ structure using translations
  const faqs = [
    {
      category: t('gettingStarted'),
      icon: <AgricultureIcon style={{ color: '#22c55e' }} />,
      questions: [
        {
          question: t('howToSetupSystem'),
          answer: t('setupSystemAnswer'),
          tags: [t('setup'), t('sensors')]
        },
        {
          question: t('whatSensorsNeeded'),
          answer: t('sensorsNeededAnswer'),
          tags: [t('sensors'), t('hardware')]
        },
        {
          question: t('howOftenDataUpdates'),
          answer: t('dataUpdatesAnswer'),
          tags: [t('data'), t('updates')]
        }
      ]
    },
    {
      category: t('diseaseDetectionHelp'),
      icon: <BugReportIcon style={{ color: '#8b5cf6' }} />,
      questions: [
        {
          question: t('aiAccuracy'),
          answer: t('aiAccuracyAnswer'),
          tags: [t('ai'), t('accuracy'), t('diseases')]
        },
        {
          question: t('diseasesDetected'),
          answer: t('diseasesDetectedAnswer'),
          tags: [t('diseases'), t('detection')]
        },
        {
          question: t('goodPhotos'),
          answer: t('goodPhotosAnswer'),
          tags: [t('photography'), t('tips')]
        },
        {
          question: t('treatmentSafety'),
          answer: t('treatmentSafetyAnswer'),
          tags: [t('treatment'), t('safety')]
        }
      ]
    },
    {
      category: t('alertsMonitoring'),
      icon: <WarningIcon style={{ color: '#f59e0b' }} />,
      questions: [
        {
          question: t('alertColors'),
          answer: t('alertColorsAnswer'),
          tags: [t('alerts'), t('colors')]
        },
        {
          question: t('humidityLevels'),
          answer: t('humidityLevelsAnswer'),
          tags: [t('humidity'), t('thresholds')]
        },
        {
          question: t('soilMoistureLevels'),
          answer: t('soilMoistureLevelsAnswer'),
          tags: [t('soil'), t('irrigation')]
        },
        {
          question: t('batteryImportance'),
          answer: t('batteryImportanceAnswer'),
          tags: [t('battery'), t('power')]
        }
      ]
    },
    {
      category: t('technicalSupport'),
      icon: <SettingsIcon style={{ color: '#3b82f6' }} />,
      questions: [
        {
          question: t('sensorsNotWorking'),
          answer: t('sensorsNotWorkingAnswer'),
          tags: [t('troubleshooting'), t('sensors')]
        },
        {
          question: t('updateLocation'),
          answer: t('updateLocationAnswer'),
          tags: [t('profile'), t('location')]
        },
        {
          question: t('exportData'),
          answer: t('exportDataAnswer'),
          tags: [t('data'), t('export')]
        },
        {
          question: t('dataSecure'),
          answer: t('dataSecureAnswer'),
          tags: [t('privacy'), t('security')]
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions
  })).filter(category => category.questions.length > 0);

  return (
    <div style={{ padding: '0', backgroundColor: '#f8fafc' }}>
      {/* FAQ Categories */}
      <Grid container spacing={2} style={{ marginBottom: '2rem' }}>
        {faqs.map((category) => (
          <Grid item xs={6} sm={3} key={category.category}>
            <Button
              fullWidth
              variant={expandedCategory === category.category ? "contained" : "outlined"}
              onClick={() => handleCategoryChange(category.category)}
              style={{
                padding: '1rem',
                backgroundColor: expandedCategory === category.category ? '#22c55e' : 'white',
                color: expandedCategory === category.category ? 'white' : '#1f2937',
                border: '2px solid #22c55e',
                borderRadius: '12px',
                textTransform: 'none'
              }}
              startIcon={category.icon}
            >
              <div>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {category.category}
                </Typography>
                <Typography variant="caption">
                  {formatSensorValue(category.questions.length, 0)} {t('questions')}
                </Typography>
              </div>
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* FAQ Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredFaqs.map((category) => (
          <Card 
            key={category.category} 
            elevation={2}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px',
              display: expandedCategory === category.category ? 'block' : 'none'
            }}
          >
            <CardContent style={{ padding: '1.5rem' }}>
              <Box display="flex" alignItems="center" mb={2}>
                {category.icon}
                <Typography variant="h6" style={{ fontWeight: 600, marginLeft: '0.5rem', color: '#1f2937' }}>
                  {category.category}
                </Typography>
              </Box>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {category.questions.map((faq, index) => (
                  <Accordion 
                    key={index}
                    elevation={0}
                    style={{ 
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body1" style={{ fontWeight: 600, color: '#1f2937' }}>
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '1rem' }}>
                        {faq.answer}
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {faq.tags.map((tag) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            style={{ 
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.75rem'
                            }}
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Emergency Guidelines */}
      <Card 
        elevation={2}
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px',
          marginTop: '2rem',
          border: '2px solid #fbbf24'
        }}
      >
        <CardContent style={{ padding: '1.5rem' }}>
          <Box display="flex" alignItems="center" mb={2}>
            <WarningIcon style={{ color: '#f59e0b', marginRight: '0.5rem' }} />
            <Typography variant="h6" style={{ fontWeight: 600, color: '#92400e' }}>
              {t('emergencyPlantHealth')}
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                {t('immediateActionRequired')}
              </Typography>
              <ul style={{ color: '#4b5563', paddingLeft: '1rem', lineHeight: 1.6 }}>
                <li>{t('temperatureHigh')}</li>
                <li>{t('soilMoistureLow')}</li>
                <li>{t('humidityHigh')}</li>
                <li>{t('multipleDiseases')}</li>
                <li>{t('sensorFailures')}</li>
              </ul>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                {t('callAgriculturalExpert')}
              </Typography>
              <ul style={{ color: '#4b5563', paddingLeft: '1rem', lineHeight: 1.6 }}>
                <li>{t('highConfidenceDisease')}</li>
                <li>{t('multipleSimultaneous')}</li>
                <li>{t('unusualSymptoms')}</li>
                <li>{t('widespreadStress')}</li>
                <li>{t('beforeChemicals')}</li>
              </ul>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Version Information */}
      <Card 
        elevation={1}
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px',
          marginTop: '2rem',
          border: '1px solid #e5e7eb'
        }}
      >
        <CardContent style={{ padding: '1rem' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                <strong>{t('grapeGuardVersion')}</strong> 1.0.0 | <strong>{t('lastUpdated')}</strong> June 2025
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} style={{ textAlign: 'right' }}>
              <Typography variant="body2" color="textSecondary">
                <strong>{t('region')}:</strong> {t('westernMaharashtra')} | <strong>{t('crops')}:</strong> {t('grapeVarieties')}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
}
// Updated DiseaseInfo.js - Grape Diseases by Growth Stage
// src/components/detection/DiseaseInfo.js

import React from 'react';
import { Card, CardContent, Typography, Grid, Box, Chip } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

export default function DiseaseInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const diseasesByStage = [
    {
      stage: t('seedlingStage'),
      diseases: [
        {
          id: 'davnya-seedling',
          name: t('davnya'),
          fullName: t('downyMildewDavnya'),
          image: '/images/davnya.jpg',
          symptoms: [
            t('yellowOilyPatches'),
            t('whiteCottonLayer')
          ],
          description: t('davnyaDescription')
        }
      ]
    },
    {
      stage: t('vegetativeStage'), 
      diseases: [
        {
          id: 'karpa-vegetative',
          name: t('karpa'),
          fullName: t('anthracnoseKarpa'),
          image: '/images/karpa.jpg',
          symptoms: [
            t('darkSpotsLightCenters'),
            t('cracksOnStems')
          ],
          description: t('karpaDescription')
        }
      ]
    },
    {
      stage: t('floweringStage'),
      diseases: [
        {
          id: 'bokadlela-flowering',
          name: t('bokadlela'), 
          fullName: t('borerInfestationBokadlela'),
          image: '/images/bokadlela.jpg',
          symptoms: [
            t('smallHolesInStems'),
            t('dustLikePowder')
          ],
          description: t('bokadlelaDescription')
        }
      ]
    },
    {
      stage: t('maturityStage'),
      diseases: [
        {
          id: 'bhuri-maturity',
          name: t('bhuri'),
          fullName: t('powderyMildewBhuri'), 
          image: '/images/bhuri.jpg',
          symptoms: [
            t('whitePowderOnLeaves'),
            t('twistedCurledLeaves')
          ],
          description: t('bhuriDescription')
        }
      ]
    }
  ];

  const sampleImages = {
    '/images/davnya.jpg': '/images/davnya.jpg',
    '/images/karpa.jpg': '/images/karpa.jpg', 
    '/images/bokadlela.jpg': '/images/bokadlela.jpg',
    '/images/bhuri.jpg': '/images/bhuri.jpg'
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header with Back Button */}
      <Box display="flex" alignItems="center" style={{ marginBottom: '1rem' }}>
        <BackIcon 
          style={{ 
            color: '#22c55e', 
            marginRight: '0.5rem', 
            cursor: 'pointer',
            fontSize: '1.5rem'
          }}
          onClick={() => navigate(-1)}
        />
        <Typography 
          variant="h5" 
          style={{ 
            fontWeight: 700, 
            color: '#1f2937'
          }}
        >
          {t('grapeDiseasesbyStage')}
        </Typography>
      </Box>

      {/* Disease Stages */}
      {diseasesByStage.map((stageData, stageIndex) => (
        <div key={stageIndex} style={{ marginBottom: '2rem' }}>
          {/* Stage Title */}
          <Typography 
            variant="h6" 
            style={{ 
              fontWeight: 600, 
              color: '#1f2937',
              marginBottom: '1rem',
              borderLeft: '4px solid #22c55e',
              paddingLeft: '1rem'
            }}
          >
            {stageData.stage}
          </Typography>

          {/* Diseases in this stage */}
          <Grid container spacing={2}>
            {stageData.diseases.map((disease) => (
              <Grid item xs={12} key={disease.id}>
                <Card 
                  elevation={2} 
                  style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <CardContent style={{ padding: '1.5rem' }}>
                    <Grid container spacing={3} alignItems="center">
                      {/* Disease Image */}
                      <Grid item xs={12} md={4}>
                        <Box
                          style={{
                            width: '100%',
                            height: '200px',
                            borderRadius: '8px',
                            backgroundImage: `url(${sampleImages[disease.image]})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Disease Name Overlay */}
                          <Box
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              padding: '0.5rem 1rem'
                            }}
                          >
                            <Typography variant="h6" style={{ fontWeight: 600 }}>
                              {disease.name}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Disease Details */}
                      <Grid item xs={12} md={8}>
                        <Box>
                          {/* Disease Title */}
                          <Typography 
                            variant="h6" 
                            style={{ 
                              fontWeight: 600, 
                              color: '#1f2937',
                              marginBottom: '0.5rem'
                            }}
                          >
                            {disease.fullName}
                          </Typography>

                          {/* Symptoms */}
                          <Box style={{ marginBottom: '1rem' }}>
                            <Typography 
                              variant="subtitle2" 
                              style={{ 
                                fontWeight: 600, 
                                color: '#374151',
                                marginBottom: '0.5rem'
                              }}
                            >
                              {t('symptoms')}
                            </Typography>
                            {disease.symptoms.map((symptom, index) => (
                              <Typography 
                                key={index}
                                variant="body2" 
                                style={{ 
                                  color: '#6b7280',
                                  marginBottom: '0.25rem',
                                  paddingLeft: '1rem',
                                  position: 'relative'
                                }}
                              >
                                <span style={{
                                  position: 'absolute',
                                  left: '0',
                                  color: '#22c55e',
                                  fontWeight: 'bold'
                                }}>•</span>
                                {symptom}
                              </Typography>
                            ))}
                          </Box>

                          {/* Description */}
                          <Typography 
                            variant="body2" 
                            style={{ 
                              color: '#4b5563',
                              lineHeight: 1.6,
                              marginBottom: '1rem'
                            }}
                          >
                            {disease.description}
                          </Typography>

                          {/* Stage Chip */}
                          <Chip
                            label={stageData.stage}
                            size="small"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>
      ))}
    </div>
  );
}

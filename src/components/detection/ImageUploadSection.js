// Updated ImageUploadSection.js with Multilingual Support
// src/components/detection/ImageUploadSection.js

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Tooltip,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Camera as CameraIcon,
  Analytics as AnalysisIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext'; // Add translation support

export default function ImageUploadSection({ 
  selectedImage, 
  onImageUpload, 
  onImageClear, 
  onRunAnalysis, 
  analyzing, 
  modelLoaded,
  results,
  modelError
}) {
  const [dragOver, setDragOver] = useState(false);
  const { t } = useTranslation(); // Add translation hook

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    onImageUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    onImageUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Determine if analysis should be blocked
  const isAnalysisBlocked = !modelLoaded || modelError;

  return (
    <Card elevation={2} sx={{ flex: 1, backgroundColor: 'white', borderRadius: '12px' }}>
      <CardContent sx={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          {t('uploadGrapeLeafImage')}
        </Typography>
        
        {/* Server Error Warning */}
        {modelError && (
          <Alert 
            severity="error" 
            style={{ 
              marginBottom: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5'
            }}
            icon={<ErrorIcon />}
          >
            <Typography variant="body2" style={{ fontWeight: 600 }}>
              {t('detectronServerOffline')}
            </Typography>
            <Typography variant="caption">
              {t('imageUploadDisabled')}
            </Typography>
          </Alert>
        )}
        
        <div
          style={{
            border: `2px dashed ${dragOver ? '#8b5cf6' : (isAnalysisBlocked ? '#ef4444' : '#d1d5db')}`,
            borderRadius: '12px',
            padding: '1.5rem',
            textAlign: 'center',
            backgroundColor: dragOver ? '#faf5ff' : (isAnalysisBlocked ? '#fef2f2' : '#f9fafb'),
            transition: 'all 0.3s ease',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '500px',
            opacity: isAnalysisBlocked ? 0.6 : 1
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {selectedImage ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
              <img
                src={selectedImage}
                alt="Selected leaf"
                style={{
                  maxWidth: '100%',
                  maxHeight: '350px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  filter: isAnalysisBlocked ? 'grayscale(50%)' : 'none'
                }}
              />
              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="outlined"
                  onClick={onImageClear}
                  size="small"
                  disabled={isAnalysisBlocked}
                >
                  {t('chooseDifferentImage')}
                </Button>
              </Box>
              
              {isAnalysisBlocked && (
                <Typography variant="caption" color="error" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  {t('cannotAnalyze')}
                </Typography>
              )}
            </div>
          ) : (
            <>
              {isAnalysisBlocked ? (
                <ErrorIcon style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }} />
              ) : (
                <UploadIcon style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }} />
              )}
              
              <Typography variant="h6" style={{ 
                color: isAnalysisBlocked ? '#ef4444' : '#6b7280', 
                marginBottom: '0.5rem' 
              }}>
                {isAnalysisBlocked ? t('uploadDisabled') : t('dragDropImage')}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '1rem' }}>
                {isAnalysisBlocked 
                  ? 'AI model unavailable. Please try again later.'
                  : t('clickToBrowse')
                }
              </Typography>
              
              {!isAnalysisBlocked && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<CameraIcon />}
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #22c55e)', color: 'white' }}
                    >
                      {t('selectImage')}
                    </Button>
                  </label>
                </>
              )}
            </>
          )}
        </div>

        {selectedImage && (
          <Box sx={{ mt: 'auto', pt: 2 }}>
            {isAnalysisBlocked ? (
              <Tooltip title="AI model unavailable. Please try again later.">
                <div>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={true}
                    startIcon={<ErrorIcon />}
                    style={{ 
                      backgroundColor: '#ef4444', 
                      color: 'white',
                      opacity: 0.6
                    }}
                  >
                    {t('serverRequiredForAI')}
                  </Button>
                </div>
              </Tooltip>
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={onRunAnalysis}
                disabled={analyzing || !modelLoaded}
                startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AnalysisIcon />}
                style={{ 
                  background: analyzing ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6, #22c55e)', 
                  color: 'white' 
                }}
              >
                {analyzing ? t('analyzingWithAI') : t('runAIAnalysis')}
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

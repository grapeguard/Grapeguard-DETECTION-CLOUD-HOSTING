// Updated ResultsSection.js with Regions Removed
// src/components/detection/ResultsSection.js

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Analytics as AnalysisIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  Compare as CompareIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from '../../context/LanguageContext';

export default function ResultsSection({ 
  selectedImage, 
  analyzing, 
  results, 
  modelInfo, 
  showVisualization 
}) {
  
  const [imageComparisonOpen, setImageComparisonOpen] = useState(false);
  const { t, getSeverityLabel, getTreatmentRecommendations, formatSensorValue } = useTranslation();
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'High':
        return <ErrorIcon style={{ color: '#ef4444' }} />;
      case 'Medium':
        return <WarningIcon style={{ color: '#f59e0b' }} />;
      case 'None':
        return <CheckCircleIcon style={{ color: '#22c55e' }} />;
      default:
        return <InfoIcon style={{ color: '#6b7280' }} />;
    }
  };

  const downloadVisualization = () => {
    if (results?.visualizationImage || results?.currentVisualization) {
      const link = document.createElement('a');
      link.href = results.currentVisualization || results.visualizationImage;
      link.download = `grape-disease-analysis-${Date.now()}.jpg`;
      link.click();
    }
  };

  const handleCompareClick = () => {
    console.log('Compare clicked'); // Debug log
    setImageComparisonOpen(true);
  };

  const handleCloseDialog = () => {
    console.log('Closing dialog'); // Debug log
    setImageComparisonOpen(false);
  };

  return (
    <>
      <Card elevation={2} sx={{ flex: 1, backgroundColor: 'white', borderRadius: '12px' }}>
        <CardContent sx={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              {t('aiAnalysisResults')}
            </Typography>
            
            {(results?.visualizationImage || results?.currentVisualization) && (
              <Box display="flex" gap={1}>
                <Tooltip title={t('downloadVisualization')}>
                  <IconButton size="small" onClick={downloadVisualization}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('compareImages')}>
                  <IconButton size="small" onClick={handleCompareClick}>
                    <CompareIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {!selectedImage && !results && (
            <Box style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: '#9ca3af'
            }}>
              <AnalysisIcon style={{ fontSize: '4rem', marginBottom: '1rem' }} />
              <Typography variant="h6" style={{ marginBottom: '0.5rem' }}>
                {t('uploadImageToSeeResults')}
              </Typography>
            </Box>
          )}

          {analyzing && (
            <Box style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <CircularProgress size={60} style={{ color: '#8b5cf6', marginBottom: '1rem' }} />
              <Typography variant="h6" style={{ color: '#1f2937', marginBottom: '0.5rem' }}>
                {t('aiIsAnalyzing')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {modelInfo?.type.includes('Detectron2') 
                  ? 'Using your trained Detectron2 model for precise detection'
                  : 'Using advanced analysis for disease identification'
                }
              </Typography>
            </Box>
          )}

          {results && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              {/* Disease Detection Alert */}
              <Alert 
                severity={results.severity === 'High' ? 'error' : results.severity === 'Medium' ? 'warning' : results.severity === 'None' ? 'success' : 'info'}
                style={{ borderRadius: '8px' }}
                icon={getSeverityIcon(results.severity)}
              >
                <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {results.disease}
                </Typography>
                {results.marathi && (
                  <Typography variant="body2" style={{ fontStyle: 'italic', color: '#059669', marginTop: '0.25rem' }}>
                    {results.marathi}
                  </Typography>
                )}
              </Alert>

              {/* AI Visualization - NON-CLICKABLE */}
              {(results.visualizationImage || results.currentVisualization) && showVisualization && (
                <Box>
                  <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>
                    {t('aiDetectionVisualization')}
                  </Typography>
                  <img
                    src={results.currentVisualization || results.visualizationImage}
                    alt="AI Analysis"
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      pointerEvents: 'none' // Make it non-clickable
                    }}
                  />
                  <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: '0.25rem' }}>
                    {t('aiEnhancedVisualization')}
                  </Typography>
                </Box>
              )}

              {/* SIMPLIFIED: Only show AI Confidence - removed regions and healthy area */}
              <Box style={{ 
                backgroundColor: '#eff6ff', 
                padding: '1.5rem', 
                borderRadius: '8px', 
                textAlign: 'center' 
              }}>
                <Typography variant="h4" style={{ 
                  fontWeight: 'bold', 
                  color: '#3b82f6',
                  marginBottom: '0.5rem'
                }}>
                  {formatSensorValue(results.confidence || 0, 1)}%
                </Typography>
                <Typography variant="body2" color="textSecondary" style={{ fontWeight: 600 }}>
                  {t('aiConfidence')}
                </Typography>
              </Box>

              {/* Treatment Recommendations with proper translations */}
              <Box style={{ flex: 1 }}>
                <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>
                  {t('treatmentRecommendations')}
                </Typography>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {getTreatmentRecommendations(results.disease).slice(0, 4).map((rec, index) => (
                    <Typography 
                      key={index} 
                      variant="body2" 
                      style={{ 
                        padding: '0.5rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '6px',
                        borderLeft: '3px solid #22c55e',
                        fontSize: '0.875rem'
                      }}
                    >
                      • {rec}
                    </Typography>
                  ))}
                </div>
              </Box>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Comparison Dialog */}
      <Dialog
        open={imageComparisonOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{t('aiAnalysisComparison')}</Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && results && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {t('originalImage')}
                </Typography>
                <img
                  src={selectedImage}
                  alt="Original"
                  style={{
                    width: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {t('aiDetectionResults')}
                </Typography>
                {(results.visualizationImage || results.currentVisualization) ? (
                  <img
                    src={results.currentVisualization || results.visualizationImage}
                    alt="AI Analysis"
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                ) : (
                  <Box
                    style={{
                      width: '100%',
                      height: '400px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      {t('noVisualizationAvailable')}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
          
          {/* Detection details with regions removed */}
          {results?.detectionDetails && (
            <Box mt={2} p={2} style={{ backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {t('detectionDetails')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>{t('disease')}:</strong> {results.disease}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('confidence')}:</strong> {formatSensorValue(results.confidence || 0, 1)}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('severity')}:</strong> {getSeverityLabel(results.severity)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>{t('processingTime')}:</strong> {formatSensorValue(results.detectionDetails?.processingTime || 0, 0)}s
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('model')}:</strong> {modelInfo?.type || 'Unknown'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('storage')}:</strong> {t('optimized')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={downloadVisualization} startIcon={<DownloadIcon />}>
            {t('downloadVisualization')}
          </Button>
          <Button onClick={handleCloseDialog}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

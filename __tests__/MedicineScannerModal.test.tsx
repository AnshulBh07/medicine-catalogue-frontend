import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MedicineScannerModal } from '../src/screens/medicines/MedicineScannerModal';

describe('MedicineScannerModal Component - Backdrop Fade and Panel Slide Separation', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    scannedPhotos: [],
    isScanningOcr: false,
    onCapturePhoto: jest.fn(),
    onRemovePhoto: jest.fn(),
    onProcessPhotos: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. does not render when visible is false', async () => {
    await render(
      <MedicineScannerModal {...defaultProps} visible={false} />
    );

    expect(screen.queryByTestId('medicine-scanner-modal')).toBeNull();
  });

  it('2. renders backdrop and modal panel as independent sibling layers under transparent Modal', async () => {
    await render(
      <MedicineScannerModal {...defaultProps} visible={true} />
    );

    const modal = screen.getByTestId('medicine-scanner-modal');
    expect(modal).toBeTruthy();

    // Verify backdrop layer exists independently
    const backdropContainer = screen.getByTestId('medicine-scanner-modal-backdrop-container');
    expect(backdropContainer).toBeTruthy();

    const backdropTouch = screen.getByTestId('scanner-modal-backdrop');
    expect(backdropTouch).toBeTruthy();

    // Verify panel layer exists independently
    const panel = screen.getByTestId('medicine-scanner-modal-content');
    expect(panel).toBeTruthy();

    // Content verified
    expect(screen.getByText('Scan Medicine Packaging')).toBeTruthy();
    expect(screen.getByText('Capture photos of front, back, or side packaging')).toBeTruthy();
  });

  it('3. backdrop has opacity animation and panel has translateY transform independently', async () => {
    await render(
      <MedicineScannerModal {...defaultProps} visible={true} />
    );

    const backdrop = screen.getByTestId('medicine-scanner-modal-backdrop-container');
    const panel = screen.getByTestId('medicine-scanner-modal-content');

    // Backdrop style should contain opacity style object, but NOT a translateY transform
    const backdropStyle = Array.isArray(backdrop.props.style)
      ? Object.assign({}, ...backdrop.props.style.filter(Boolean))
      : backdrop.props.style;

    expect(backdropStyle.opacity).toBeDefined();
    expect(backdropStyle.transform).toBeUndefined();

    // Panel style should contain transform with translateY, but NOT the backdrop's background color
    const panelStyle = Array.isArray(panel.props.style)
      ? Object.assign({}, ...panel.props.style.filter(Boolean))
      : panel.props.style;

    expect(panelStyle.transform).toBeDefined();
    expect(panelStyle.transform[0].translateY).toBeDefined();
  });

  it('4. closes when the stationary backdrop is tapped', async () => {
    const onClose = jest.fn();
    await render(
      <MedicineScannerModal {...defaultProps} visible={true} onClose={onClose} />
    );

    fireEvent.press(screen.getByTestId('scanner-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('5. closes when the close icon button is tapped', async () => {
    const onClose = jest.fn();
    await render(
      <MedicineScannerModal {...defaultProps} visible={true} onClose={onClose} />
    );

    fireEvent.press(screen.getByTestId('btn-close-scanner-modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('6. triggers photo capture handlers and shows thumbnails with remove action', async () => {
    const onCapturePhoto = jest.fn();
    const onRemovePhoto = jest.fn();
    const onProcessPhotos = jest.fn();

    const photos = [
      { uri: 'file://img1.jpg', label: 'Front Packaging' },
      { uri: 'file://img2.jpg', label: 'Back / Composition' },
    ];

    await render(
      <MedicineScannerModal
        {...defaultProps}
        visible={true}
        scannedPhotos={photos}
        onCapturePhoto={onCapturePhoto}
        onRemovePhoto={onRemovePhoto}
        onProcessPhotos={onProcessPhotos}
      />
    );

    // Photos rendered
    expect(screen.getByTestId('scanned-photo-card-0')).toBeTruthy();
    expect(screen.getByTestId('scanned-photo-card-1')).toBeTruthy();
    expect(screen.getByText('Front Packaging')).toBeTruthy();
    expect(screen.getByText('Back / Composition')).toBeTruthy();

    // Camera button
    fireEvent.press(screen.getByTestId('btn-capture-camera'));
    expect(onCapturePhoto).toHaveBeenCalledWith('camera');

    // Gallery button
    fireEvent.press(screen.getByTestId('btn-capture-gallery'));
    expect(onCapturePhoto).toHaveBeenCalledWith('library');

    // Remove photo 0
    fireEvent.press(screen.getByTestId('remove-photo-0'));
    expect(onRemovePhoto).toHaveBeenCalledWith(0);

    // Process button
    fireEvent.press(screen.getByTestId('btn-process-photos'));
    expect(onProcessPhotos).toHaveBeenCalledTimes(1);
  });

  it('7. disables close and actions while OCR extraction is in progress', async () => {
    const onClose = jest.fn();
    await render(
      <MedicineScannerModal
        {...defaultProps}
        visible={true}
        isScanningOcr={true}
        onClose={onClose}
        scannedPhotos={[{ uri: 'file://img1.jpg', label: 'Front Packaging' }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-close-scanner-modal')).toBeTruthy();
    });

    // Close button disabled
    fireEvent.press(screen.getByTestId('btn-close-scanner-modal'));
    expect(onClose).not.toHaveBeenCalled();

    // Backdrop tap ignored
    fireEvent.press(screen.getByTestId('scanner-modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();

    // Extracting loading state displayed
    expect(screen.getByText('Extracting text & details...')).toBeTruthy();
  });
});

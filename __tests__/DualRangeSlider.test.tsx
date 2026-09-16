import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { DualRangeSlider, formatRupee } from '../src/components/DualRangeSlider';

describe('DualRangeSlider Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('formats rupee values correctly in Indian numbering style', () => {
    expect(formatRupee(0)).toBe('₹0');
    expect(formatRupee(100)).toBe('₹100');
    expect(formatRupee(2500)).toBe('₹2,500');
    expect(formatRupee(5000)).toBe('₹5,000');
    expect(formatRupee(100000)).toBe('₹1,00,000');
  });

  it('renders minimum, maximum, and selected range badge', async () => {
    const onChange = jest.fn();

    await render(
      <DualRangeSlider
        min={0}
        max={5000}
        lowValue={100}
        highValue={2500}
        onChange={onChange}
        testID="price-slider"
      />,
    );

    expect(screen.getByText('₹0')).toBeTruthy();
    expect(screen.getByText('₹5,000')).toBeTruthy();
    expect(screen.getByText('₹100 – ₹2,500')).toBeTruthy();
  });

  it('renders (All Prices) indicator when full range is selected', async () => {
    const onChange = jest.fn();

    await render(
      <DualRangeSlider
        min={0}
        max={5000}
        lowValue={0}
        highValue={5000}
        onChange={onChange}
        testID="price-slider"
      />,
    );

    expect(screen.getByText('₹0 – ₹5,000')).toBeTruthy();
    expect(screen.getByText(' (All Prices)')).toBeTruthy();
  });

  it('measures track layout and handles track press', async () => {
    const onChange = jest.fn();

    await render(
      <DualRangeSlider
        min={0}
        max={5000}
        step={50}
        lowValue={0}
        highValue={5000}
        onChange={onChange}
        testID="price-slider"
      />,
    );

    const track = screen.getByTestId('slider-track');

    // Simulate onLayout
    if (track.parent) {
      fireEvent(track.parent, 'layout', {
        nativeEvent: { layout: { width: 300, height: 44 } },
      });
    }

    // Press on track near left (e.g. 50px)
    fireEvent(track, 'press', {
      nativeEvent: { locationX: 50 },
    });

    expect(onChange).toHaveBeenCalled();
  });
});

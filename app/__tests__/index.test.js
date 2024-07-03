// __tests__/index.test.js

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../index';

jest.mock('react-native-ble-plx', () => {
  return {
    BleManager: jest.fn().mockImplementation(() => ({
      startDeviceScan: jest.fn((_, __, callback) => {
        callback(null, { id: '123', name: 'Test Device', rssi: -45 });
      }),
      stopDeviceScan: jest.fn(),
      destroy: jest.fn(),
    })),
  };
});

describe('App', () => {
  it('renders correctly', () => {
    const { getByText } = render(<App />);
    expect(getByText('Scan for BLE Peripherals')).toBeTruthy();
  });

  it('scans for BLE devices and displays them', async () => {
    const { getByText, queryByText } = render(<App />);

    const scanButton = getByText('Scan for BLE Peripherals');
    fireEvent.press(scanButton);

    await waitFor(() => expect(queryByText('Scanning...')).toBeTruthy());

    await waitFor(() => expect(getByText('Name: Test Device')).toBeTruthy());
    await waitFor(() => expect(getByText('RSSI: -45')).toBeTruthy());
  });

  
});

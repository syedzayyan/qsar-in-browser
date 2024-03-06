import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataPreProcessToolKit from './components/dataloader/DataPreProcessToolKit';

describe('DataPreProcessToolKit', () => {
  test('renders the component', () => {
    render(<DataPreProcessToolKit />);
    const headingElement = screen.getByText(/Data Pre-Processing/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('submits the form', async () => {
    render(<DataPreProcessToolKit />);
    const submitButton = screen.getByText(/Process Molecule/i);
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/Processing Molecules/i)).toBeInTheDocument();
    });
  });

  test('changes the fingerprint type', () => {
    render(<DataPreProcessToolKit />);
    const fingerprintSelect = screen.getByLabelText(/Fingerprint Type:/i);
    fireEvent.change(fingerprintSelect, { target: { value: 'maccs' } });
    expect(fingerprintSelect.value).toBe('maccs');
  });

  test('toggles data de-duplication', () => {
    render(<DataPreProcessToolKit />);
    const dedupCheckbox = screen.getByLabelText(/Data De-Duplication/i);
    fireEvent.click(dedupCheckbox);
    expect(dedupCheckbox.checked).toBe(false);
  });
});
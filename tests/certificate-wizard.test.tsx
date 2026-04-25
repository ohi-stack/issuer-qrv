import React from 'react';
import { render, screen } from '@testing-library/react';
import { IssueCertificateWizard } from '@/components/certificates/IssueCertificateWizard';

describe('IssueCertificateWizard', () => {
  it('renders initial step', () => {
    render(<IssueCertificateWizard />);
    expect(screen.getByText('Issue Certificate Wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByLabelText('certificateTitle')).toBeInTheDocument();
  });
});

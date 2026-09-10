import Swal from 'sweetalert2';

export const showSuccess = (message) => {
  return Swal.fire({
    icon: 'success',
    title: 'Success!',
    text: message,
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'OK'
  });
};

export const showError = (message) => {
  return Swal.fire({
    icon: 'error',
    title: 'Error!',
    text: message,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'OK'
  });
};

export const showWarning = (message) => {
  return Swal.fire({
    icon: 'warning',
    title: 'Warning!',
    text: message,
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'OK'
  });
};

export const showInfo = (message) => {
  return Swal.fire({
    icon: 'info',
    title: 'Info',
    text: message,
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'OK'
  });
};

export const showConfirm = (message, confirmText = 'Yes, do it!', cancelText = 'Cancel') => {
  return Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText
  });
};

export const showOtpPrompt = (title = 'Enter Ride Start OTP', text = 'Ask the passenger for the 4-digit start OTP to begin the ride.') => {
  return Swal.fire({
    title,
    text,
    input: 'text',
    inputPlaceholder: '4-digit OTP (e.g. 4829)',
    inputAttributes: {
      maxlength: '4',
      autocapitalize: 'off',
      autocorrect: 'off',
      style: 'text-align: center; letter-spacing: 0.4em; font-size: 1.5rem; font-weight: bold; width: 220px; margin: 0 auto;'
    },
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Verify & Start Ride',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => {
      if (!value) {
        return 'Please enter the OTP';
      }
      if (!/^\d{4}$/.test(value.trim())) {
        return 'OTP must be exactly 4 numeric digits';
      }
      return null;
    }
  });
};

export const showLoading = (message = 'Processing...') => {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

export const closeLoading = () => {
  Swal.close();
};

export const showSuccessAuto = (message, ms = 3000) => {
  return Swal.fire({
    icon: 'success',
    title: 'Success!',
    text: message,
    timer: ms,
    showConfirmButton: false,
    timerProgressBar: true,
    willClose: () => { },
  });
};

export default Swal;

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


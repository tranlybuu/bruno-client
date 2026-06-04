import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { newFile } from 'providers/ReduxStore/slices/collections/actions';
import { validateName, validateNameError } from 'utils/common/regex';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

const NewFile = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      fileName: ''
    },
    validationSchema: Yup.object({
      fileName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('file name is required')
        .test('is-valid-file-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
    }),
    onSubmit: (values) => {
      dispatch(newFile(values.fileName, collectionUid, item ? item.uid : null))
        .then(() => {
          toast.success('New file created!');
          onClose();
        })
        .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the file'));
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <Portal>
      <StyledWrapper>
        <Modal size="md" title="New File" hideFooter={true} handleCancel={onClose}>
          <form className="bruno-form" onSubmit={formik.handleSubmit}>
            <label htmlFor="fileName" className="block font-medium">
              File Name (including extension)
            </label>
            <input
              id="file-name"
              type="text"
              name="fileName"
              ref={inputRef}
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.fileName || ''}
              placeholder="e.g. config.js, README.md"
            />
            {formik.touched.fileName && formik.errors.fileName ? (
              <div className="text-red-500 mt-1">{formik.errors.fileName}</div>
            ) : null}

            <div className="flex justify-end mt-8 bruno-modal-footer">
              <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-2">
                Cancel
              </Button>
              <Button type="submit">
                Create
              </Button>
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default NewFile;

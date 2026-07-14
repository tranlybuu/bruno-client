import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import path from 'utils/common/path';
import Button from 'ui/Button';

const NewFlow = ({ collection, item, onClose }) => {
  const inputRef = useRef();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      flowName: '',
      fileName: ''
    },
    validationSchema: Yup.object({
      flowName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('name is required'),
      fileName: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .required('filename is required')
        .test('is-valid-file-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
    }),
    onSubmit: async (values) => {
      try {
        const { ipcRenderer } = window;
        if (ipcRenderer) {
          const parentPath = item ? item.pathname : collection.pathname;
          const filePath = path.join(parentPath, `${values.fileName}.bruflow`);

          await ipcRenderer.invoke('renderer:write-file-content', {
            pathname: filePath,
            content: JSON.stringify({ nodes: [], edges: [] }, null, 2)
          });

          toast.success('New flow created!');
          onClose();
        }
      } catch (err) {
        toast.error(err ? err.message : 'An error occurred while creating the flow');
      }
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <Portal>
      <Modal size="md" title="New Visual Flow" hideFooter={true} handleCancel={onClose}>
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <label htmlFor="flowName" className="block font-medium">
            Flow Name
          </label>
          <input
            id="flow-name"
            type="text"
            name="flowName"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={(e) => {
              formik.setFieldValue('flowName', e.target.value);
              formik.setFieldValue('fileName', sanitizeName(e.target.value));
            }}
            value={formik.values.flowName || ''}
          />
          {formik.touched.flowName && formik.errors.flowName ? (
            <div className="text-red-500 text-xs mt-1">{formik.errors.flowName}</div>
          ) : null}

          <div className="mt-4">
            <label htmlFor="fileName" className="block font-medium">
              File Name
            </label>
            <div className="relative flex flex-row gap-1 items-center justify-between">
              <input
                id="file-name"
                type="text"
                name="fileName"
                className="!pr-20 block textbox mt-2 w-full"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.fileName || ''}
              />
              <span className="absolute right-2 top-4 flex justify-center items-center file-extension text-muted text-xs">.bruflow</span>
            </div>
            {formik.touched.fileName && formik.errors.fileName ? (
              <div className="text-red-500 text-xs mt-1">{formik.errors.fileName}</div>
            ) : null}
          </div>

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
    </Portal>
  );
};

export default NewFlow;

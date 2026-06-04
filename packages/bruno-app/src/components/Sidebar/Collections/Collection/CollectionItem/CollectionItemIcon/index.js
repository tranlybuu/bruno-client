import RequestMethod from '../RequestMethod';
import {
  IconLoader2,
  IconAlertTriangle,
  IconAlertCircle,
  IconFile,
  IconBrandJavascript,
  IconMarkdown,
  IconBraces,
  IconBrandHtml5,
  IconBrandCss3,
  IconFileCode,
  IconFileSpreadsheet,
  IconFileZip,
  IconFileText
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollectionItemIcon = ({ item }) => {
  if (item?.error) {
    return <StyledWrapper><IconAlertCircle className="w-fit mr-2 error" size={18} strokeWidth={1.5} /></StyledWrapper>;
  }

  if (item?.loading) {
    return <IconLoader2 className="animate-spin w-fit mr-2" size={18} strokeWidth={1.5} />;
  }

  if (item?.partial) {
    return <StyledWrapper><IconAlertTriangle size={18} className="w-fit mr-2 partial" strokeWidth={1.5} /></StyledWrapper>;
  }

  if (item?.type === 'file') {
    const extension = item.name ? item.name.split('.').pop().toLowerCase() : '';
    let IconComponent = IconFile;

    if (extension === 'js') {
      IconComponent = IconBrandJavascript;
    } else if (extension === 'md') {
      IconComponent = IconMarkdown;
    } else if (extension === 'json') {
      IconComponent = IconBraces;
    } else if (extension === 'html') {
      IconComponent = IconBrandHtml5;
    } else if (extension === 'css') {
      IconComponent = IconBrandCss3;
    } else if (['ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'bat', 'rb'].includes(extension)) {
      IconComponent = IconFileCode;
    } else if (['csv', 'xlsx', 'xls'].includes(extension)) {
      IconComponent = IconFileSpreadsheet;
    } else if (['zip', 'tar', 'gz', '7z', 'rar'].includes(extension)) {
      IconComponent = IconFileZip;
    } else if (extension === 'txt') {
      IconComponent = IconFileText;
    }

    return <IconComponent className="w-fit mr-2" size={18} strokeWidth={1.5} />;
  }

  return <RequestMethod item={item} />;
};

export default CollectionItemIcon;

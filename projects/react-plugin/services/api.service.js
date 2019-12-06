import axios from 'axios';
import { DUPLICATE_CODE, GALLERY_IMAGES_LIMIT, REPLACING_DATA_CODE } from '../config';


const independentProtocolRegex = /^[https|http]+\:\/\//g;

export const getBaseUrl = (container, platform = 'filerobot') =>  platform === 'filerobot' ?
  `https://api.filerobot.com/${container}/v3/` :
  `https://${container}.api.airstore.io/v1/`;

export const getSecretHeaderName = (platform = 'filerobot') => platform === 'filerobot' ?
  `X-Filerobot-Key` : `X-Airstore-Secret-Key`;

export const send = (url, method = 'GET', data = null, headers = {}, responseType = "json", onUploadProgress) =>
  axios({
    url: url,
    method: method,
    data: data,
    responseType: responseType,
    headers: headers,
    onUploadProgress
  }).then(({ data = {} }) => data);


/**
 * Send files to airstore storage.
 * We can send 2 types of files:
 *  - files from <input type="file"/>
 *  - files from urls
 * Method understand what files we give via "data_type" attribute.
 *
 * @param props.uploadPath    {string}  Airstore upload url (like: "//jolipage001.api.airstore.io/upload") or custom
 *   handler
 * @param props.uploadParams  {object}  Params which we need to send to uploadPath
 * @param props.files         {array}   Array with files
 * @param props.uploadKey     {string}  = secret key
 * @param props.data_type     {string}  Available values: "files[]", "files_url[]" (or another if you use custom
 *   handler
 *   uploadPath)
 * @param props.dir     {string}  = directory to upload files
 * @param props.showAlert     {function}  = show alert
 * @returns {Promise}
 */
export const uploadFiles = (props) => {
  let {
    files = [],
    config: { platform, uploadPath = '', uploadParams = {}, uploadKey = '', onUploadProgress } = {},
    data_type = 'files[]',
    dir,
    showAlert
  } = props;
  let url = (uploadPath || ''); // use independent protocol
  const ajaxData = new FormData();
  const jsonData = { files_urls: [] };
  const isJson = data_type === 'application/json';

  uploadParams = { ...uploadParams, ...{ dir: dir || uploadParams.dir } };

  // generate params string
  const paramsStr = Object.keys(uploadParams)
    .filter(paramName => uploadParams[paramName] !== null) // do not use params with NULL value
    .map(paramName => `${paramName}=${uploadParams[paramName]}`)
    .join('&');

  if (paramsStr)
    url += `?${paramsStr}`

  if (files && isJson) {
    [...files].forEach(file => { jsonData.files_urls.push(file); });
  } else if (files)
    [...files].forEach(file => ajaxData.append(data_type, file, file.name || null)); // fill FormData

  return new Promise((resolve, reject) => {
    send(
      url,
      'POST',
      isJson ? jsonData : ajaxData,
      {
        [getSecretHeaderName(platform)]: uploadKey,
        'Content-Type': isJson ? 'application/json' : 'multipart/form-data'
      },
      'json',
      onUploadProgress
    ).then(
      response => {
        const { status = 'success', files = [], file, upload = {} } = response;
        const isDuplicate = upload.state === DUPLICATE_CODE;
        const isReplacingData = upload.state === REPLACING_DATA_CODE;

        if (status === 'success' && file) {
          //file.public_link = file.public_link.replace(independentProtocolRegex, '//');

          resolve([[file], isDuplicate, isReplacingData]);
        } else if (status === 'success' && files) {
          resolve([files, isDuplicate, isReplacingData]);
        } else if (status === 'error') {
          throw new Error(response.msg + ' ' + response.hint);
        } else
          reject(response);
      }
    )
      .catch((error = {}) => {
        const data = (error.response && error.response.data) || {};
        const code = data.code || '';
        const msg = data.msg && (data.msg.join ? data.msg.join(', ') : data.msg);

        showAlert('', ((code || msg) ? `${code}: ${msg}` : '') || error.msg || error.message, 'error');
        reject(error);
      });
  });
};

export const getListFiles = ({ dir = '', container = '', platform, offset, uploadKey }) => {
  const baseUrl = getBaseUrl(container, platform);
  const apiPath = 'list?';
  const directoryPath = dir ? 'dir=' + dir : '';
  const offsetQuery = `&offset=${offset}`;
  const limit = `&limit=${GALLERY_IMAGES_LIMIT}`;
  const url = [baseUrl, apiPath, directoryPath, offsetQuery, limit].join('');

  return send(url, 'GET', null, { [getSecretHeaderName(platform)]: uploadKey }).then((response = {}) => ([
    response.files,
    response.directories,
    response.current_directory && response.current_directory.files_count
  ]));
};

export const searchFiles = ({ query = '', container = '', platform, language = 'en', offset = 0, uploadKey }) => {
  const baseUrl = getBaseUrl(container, platform);
  const apiPath = 'search?';
  const searchQuery = `q=${query}`;
  const offsetQuery = `&offset=${offset}`;
  const url = [baseUrl, apiPath, searchQuery, offsetQuery].join('');

  return send(url, 'GET', null, { [getSecretHeaderName(platform)]: uploadKey })
    .then((response = {}) => ([response.files, response.info && response.info.total_files_count]));
};

export const generateTags = (url = '', autoTaggingProps = {}, language = 'en', container = '', platform, filerobotUploadKey = '', cloudimageToken = 'demo') => {
  const { key = '', provider = 'google', confidence = 60, limit = 10 } = autoTaggingProps;
  const base = `${getBaseUrl(container, platform)}post-process/autotagging`;

  return send(
    `${base}?${[
      `key=${key}`,
      `image_url=${url}`,
      `provider=${provider}`,
      `language=${language}`,
      `confidence=${confidence}`,
      `limit=${limit}`,
      `ci=${cloudimageToken}`
    ].join('&')}`,
    'GET',
    null,
    {
      [getSecretHeaderName(platform)]: filerobotUploadKey
    }
  )
    .then((response = {}) => response);
}

export const saveMetaData = (id, properties, { container, platform, uploadKey }) => {
  const base = `${getBaseUrl(container, platform)}file/`;
  const data = { properties };

  return send(
    `${base}${id}/properties`,
    'PUT',
    data,
    {
      [getSecretHeaderName(platform)]: uploadKey
    }
  )
    .then((response = {}) => response);
}

export const updateProduct = (id, product, { container, platform, uploadKey }) => {
  const base = getBaseUrl(container, platform);
  const data = { product };

  return send(
    `${base}file/${id}/product`,
    'PUT',
    data,
    {
      [getSecretHeaderName(platform)]: uploadKey
    }
  )
    .then((response = {}) => response);
}

export const getTokenSettings = ({ container = '', platform, uploadKey }) => {
  const baseUrl = getBaseUrl(container, platform);

  return send(
    [baseUrl, 'settings'].join(''),
    'GET',
    null,
    { [getSecretHeaderName(platform)]: uploadKey }
  )
    .then(({ settings = {} } = {}) => ({
      productsEnabled: settings._products_enabled === 1
    }));
};
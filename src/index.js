import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import config from './AirstoreUploaderPlugin/config';
import { AppContainer } from 'react-hot-loader';
import AirstoreUploaderWrapper from './AirstoreUploaderPlugin/components/AirstoreUploaderWrapper';
import registerServiceWorker from './registerServiceWorker';
import { ThemeProvider } from 'styled-components';
import { darkTheme } from 'scaleflex-react-modules/dist';
import 'scaleflex-react-modules/dist/styledComponents/assets/styles/scaleflex-icon-font.css';


window.AirstoreUploader = window.AirstoreUploader || {};
window.AirstoreUploader.init = init;

function init(options = {}, isOpened = false) {
  const editor = document.querySelector('airstore-uploader');
  options = Object.assign({}, config || {}, options || {});

  options.modules = options.modules || [];
  options.settings = Object.assign({}, config.settings || {}, options.settings || {});
  options.settings.uploadPath = options.settings.uploadPath || null;
  options.settings.uploadParams = options.settings.uploadParams || {};
  options.settings.uploadParams.opt_auth_upload_key = options.settings.uploadParams.opt_auth_upload_key || null;
  options.onUpload = options.onUpload || function() {};

  window.AirstoreUploader.component = Component => {
    return render(
      <AppContainer>
        <ThemeProvider theme={darkTheme}>
          <Component opened={isOpened} initialOptions={options}/>
        </ThemeProvider>
      </AppContainer>,
      document.getElementById('airstore-uploader'),
    )
  };

  window.AirstoreUploader.component(AirstoreUploaderWrapper);

  // Webpack Hot Module Replacement API
  if (module.hot) {
    module.hot.accept(
      './AirstoreUploaderPlugin/components/AirstoreUploaderWrapper',
      () => { render(AirstoreUploaderWrapper); }
    );
  }

  registerServiceWorker();

  window.AirstoreUploader.init = init;
  window.AirstoreUploader.unmount = () => unmountComponentAtNode(editor);
}



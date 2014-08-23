#!/usr/bin/python
# to be replaced with a proper makefile eventually...

import os, shutil

if os.path.exists('build'):
    shutil.rmtree('build')
os.mkdir('build')
shutil.copytree('browser', os.path.join('build', 'browser'))
shutil.copytree('third-party',
                os.path.join('build', 'browser', 'chromium-extension',
                             'third-party'))
shutil.copytree('lib',
                os.path.join('build', 'browser', 'chromium-extension', 'lib'))

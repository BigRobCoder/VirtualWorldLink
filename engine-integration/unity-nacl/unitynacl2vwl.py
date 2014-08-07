#!/usr/bin/python

# python script to edit a Unity native client build to support VWL

import sys, os, shutil

if len(sys.argv) != 2:
    print 'unitynacl2vwl.py <nacl directory>'
    sys.exit(2)

projRoot    = os.path.join(os.getcwd(), os.pardir, os.pardir)
nacl_dir    = sys.argv[1]
html_page   = os.path.join(nacl_dir, os.path.basename(nacl_dir)+'_nacl.html')
js_page     = os.path.join(nacl_dir, 'unity_nacl_files_3.x.x', 'unity_nacl.js')
json_page   = os.path.join(nacl_dir, 'manifest.json')
html_script = [\
'        <script type="text/javascript" src="message-relay.js"></script>\n',\
'        <script type="text/javascript" src="vr.js"></script>\n',\
'        <script type="text/javascript" src="vwl.js"></script>\n',\
'        <script type="text/javascript" src="unity_nacl_vwl.js"></script>\n']
js_modify   = '                unityMessageProcess(message.data);\n'
json_append = [\
'  "web_accessible_resources": [\n',\
'    "vwl/leftEntry.png",\n',\
'    "vwl/rightEntry.png",\n',\
'    "vwl/poster.jpg"\n',\
'  ],\n']

print 'copy vwl_info.json to ' + nacl_dir + '...'
shutil.copy('vwl_info.json', nacl_dir)

print 'copy unity_nacl_vwl.js to ' + nacl_dir + '...'
shutil.copy('unity_nacl_vwl.js', nacl_dir)

vwllib = os.path.join(projRoot, 'lib', 'vwl.js')
print 'copy ' + vwllib + ' to ' + nacl_dir + '...'
shutil.copy(vwllib, nacl_dir)

vrlib = os.path.join('third-party', 'vr.js', 'vr.js')
print 'copy ' + vrlib + ' to ' + nacl_dir + '...'
shutil.copy(vrlib, nacl_dir)

# in the future, when this is a website rather than a chromium extension,
# we can skip this step
messageRelay = os.path.join(projRoot, 'browser', 'chromium-extension', 'message-relay.js')
print 'copy ' + messageRelay + ' to ' + nacl_dir + '...'
shutil.copy(messageRelay, nacl_dir)

print 'edit ' + html_page + '...'
with open(html_page, 'r') as f, open(html_page+'.tmp', 'w') as tmpF:
    scriptWritten = False
    for line in f:
        if line.find('header') != -1:
            continue;
        line = line.replace('center', 'left')
        line = line.replace('auto', 'left')
        line = line.replace('960', '1280')
        line = line.replace('600', '800')
        if not scriptWritten:
            if line == html_script[0]:
                scriptWritten = True
            elif line.find('<script') != -1:
                scriptWritten = True
                for html_script_line in html_script:
                    tmpF.write(html_script_line)
        tmpF.write(line)
os.remove(html_page)
os.rename(html_page+'.tmp', html_page)

print 'edit ' + js_page + '...'
with open(js_page, 'r') as f, open(js_page+'.tmp', 'w') as tmpF:
    written = False
    for line in f:
        if not written:
            if line == js_modify:
                written = True
            elif line.find('eval (') != -1:
                written = True
                line = js_modify;
        tmpF.write(line)
os.remove(js_page)
os.rename(js_page+'.tmp', js_page)

print 'edit ' + json_page + '...'
with open(json_page, 'r') as f, open(json_page+'.tmp', 'w') as tmpF:
    written = False
    for line in f:
        if not written:
            if line == json_append[0]:
                written = True
            elif line.find('"app":') != -1:
                written = True
                for json_append_line in json_append:
                    tmpF.write(json_append_line)
        tmpF.write(line)
os.remove(json_page)
os.rename(json_page+'.tmp', json_page)

print 'done!'

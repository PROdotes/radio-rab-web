import xml.etree.ElementTree as ET
import sys

def inspect_cameras(filename):
    print(f"--- Inspecting {filename} ---")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find the first camera record manually to avoid namespace headache
            start = content.find('<predefinedLocation')
            end = content.find('</predefinedLocation>', start) + len('</predefinedLocation>')
            if start == -1:
                print("No predefinedLocation found")
                return
            
            sample = content[start:end]
            # Strip namespaces from sample
            import re
            sample = re.sub(r'xmlns(:\w+)?="[^"]+"', '', sample)
            sample = re.sub(r'<\w+:', '<', sample)
            sample = re.sub(r'</\w+:', '</', sample)
            
            root = ET.fromstring(sample)
            print("Tag:", root.tag)
            for child in root:
                print(f"  Child: {child.tag}")
                if child.tag == 'locationForDisplay':
                    for sub in child:
                         print(f"    {sub.tag}: {sub.text}")
                if child.tag == 'trafficCameraRecord':
                    for sub in child:
                        print(f"    {sub.tag}: {sub.text if sub.text else '[Nested]'}")
                        if sub.tag == 'cameraTitle':
                             print(f"      Title Text: {sub.find('.//value').text}")
                        if sub.tag == 'stillImageUrl' or sub.tag == 'imageUrl':
                             print(f"      URL Text: {sub.text if sub.text else sub.find('.//urlLinkAddress').text}")

    except Exception as e:
        print("Error:", e)

inspect_cameras('data/raw/b2b.hak.cameras.datex.xml')
inspect_cameras('data/raw/b2b.hac.cameras.xml')

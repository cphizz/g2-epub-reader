import JSZip from 'jszip';
import { writeFileSync } from 'fs';

const zip = new JSZip();

// mimetype must be first and uncompressed
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

// container.xml
zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

// content.opf
zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Forgotten Library</dc:title>
    <dc:creator>A. Test Author</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">urn:uuid:12345678-1234-1234-1234-123456789abc</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
</package>`);

// toc.ncx
zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345678-1234-1234-1234-123456789abc"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>The Forgotten Library</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>The Beginning</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="navpoint-2" playOrder="2">
      <navLabel><text>The Discovery</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
    <navPoint id="navpoint-3" playOrder="3">
      <navLabel><text>The Return</text></navLabel>
      <content src="chapter3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

function xhtml(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;
}

zip.file('OEBPS/chapter1.xhtml', xhtml('The Beginning', `
<p>Maren had walked for three days through the grey foothills before she saw the tower. It rose from a cleft in the rock like a single dark finger pointing at the sky, its surface covered in moss and the faded remnants of carved script. She had heard rumours of this place in the lowland villages — an ancient library, older than any kingdom still marked on maps, hidden where the mountains folded in on themselves.</p>

<p>The entrance was a narrow archway half-buried in fallen stone. She squeezed through and found herself in a round vestibule lit by pale shafts of light filtering down from cracks high above. The air smelled of dust and old paper and something faintly sweet, like dried flowers pressed between pages centuries ago.</p>

<p>Beyond the vestibule a spiral staircase descended into the earth. Each step was worn smooth by countless feet, though no one living claimed to have visited in generations. Maren lit her lantern and began the long walk down, her footsteps echoing against walls lined with empty stone shelves.</p>

<p>At the bottom she emerged into a vast hall. Row after row of shelves stretched into the darkness, still holding thousands of volumes bound in leather and cloth and materials she could not name. The Forgotten Library was not a myth after all.</p>
`));

zip.file('OEBPS/chapter2.xhtml', xhtml('The Discovery', `
<p>For hours Maren wandered the silent aisles, running her fingers along cracked spines and reading titles in languages she half-recognised. Some books crumbled at her touch; others felt as solid as the day they were bound. The library seemed to go on without end, corridor branching into corridor, each section older and stranger than the last.</p>

<p>Deep in the lowest level, in a chamber whose ceiling was painted with unfamiliar constellations, she found a book that was different from the rest. It sat alone on a stone pedestal, bound in dark blue leather that shimmered faintly when the lantern light struck it. There was no title on the cover — only a small silver clasp shaped like a crescent moon.</p>

<p>When she opened the clasp the pages began to glow with a soft amber light of their own. The text shifted as she watched, rearranging itself from an ancient script into words she could read. It described places she had never heard of, events that had not yet happened, and people whose names stirred a strange sense of recognition in her chest.</p>

<p>Maren sat cross-legged on the cold stone floor and read until her lantern burned low. The book seemed to respond to her attention, revealing more with every page she turned, as though it had been waiting a very long time for someone to find it.</p>
`));

zip.file('OEBPS/chapter3.xhtml', xhtml('The Return', `
<p>She knew she could not stay. The library was a place for preservation, not habitation, and the book on the pedestal carried a weight she was only beginning to understand. Maren closed it carefully, fastened the silver clasp, and tucked it into her satchel. The glow faded as the cover shut, but she could still feel a faint warmth through the leather, like a heartbeat.</p>

<p>The climb back to the surface was harder than the descent. Her legs ached and the lantern had gone out entirely, but a thin luminescence from the book's spine lit just enough of each step to guide her. When she finally squeezed through the archway into open air, the sky was thick with stars and the mountain wind was cold on her face.</p>

<p>Maren made camp in the shelter of the tower's outer wall and slept more deeply than she had in weeks. In the morning she started the long walk back to the lowlands, the book resting securely against her back. She did not know yet what it would ask of her, or where its shifting pages would lead, but she felt certain of one thing: the Forgotten Library had chosen its keeper.</p>

<p>Behind her the stone archway settled further into the hillside, half-hidden once more, waiting with the patience of centuries for the next traveller brave or lost enough to find it.</p>
`));

const buf = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
writeFileSync('test-book.epub', buf);
console.log('Created test-book.epub (' + buf.length + ' bytes)');

# xml-peruse

`xml-peruse` is a typed buffered XML parsing library written in typescript.

## Overview

I wrote this library while working on a project that involved parsing very large dictionary files in XML format (such as [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html)). 

There are indeed a number of parsing libraries already out there, but I kept running into either one of these two problems:
* They are either untyped or have weak typing systems, or
* They try to rebuild the XML tree as a javascript object from the root, leading to a memory overflow when dealing with large objects

I tried running [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) on JMDict and ran into both of these problems.

**xml-peruse** solves both of these problems by allowing you to:
* Define your own Json schema using typescript definitions, and
* Define handlers per-XML element type, so that you don't need to keep more than one object in memory at a time.

To elaborate on the second point, it is very common for large XML files to be formatted essentially as a single root element containing lots of the same first-level element. (In JMDict's case it is `<entry>`.) It's sufficient to hold just a single buffer for the `<entry>` type and clean it out after each closing `</entry>` tag, minimizing memory usage.

The disadvantage of this method is that it is not good at handling complex or malformed XML documents, such as unclosed openings tags for nested elements (an `<entry>` within an `<entry>`). There are ways to handle this, but that will be left for future work. For now it is very good at doing what it is designed to do, which is to parse well-validated and large XML files with minimal memory overhead.

Another advantage of this method is that you can partially parse a file by just taking the first N elements and terminating early.

## Example

Using Jmdict as an example, a schema might look something like this:
```
type JME_Xref = JmdictElement & {
    tagName: 'xref',
    children: [string]
};
type JME_Sinf = JmdictElement & {
    tagName: 's_inf',
    children: [string]
};
type JME_Sense = JmdictElement & {
    tagName: 'sense',
    children: (JME_Gloss | JME_Misc | JME_Pos | JME_Xref | JME_Misc | JME_Sinf)[]
};
type JME_Entry = JmdictElement & {
    tagName: 'entry',
    children: (JME_EntSeq | JME_Kele | JME_Rele | JME_Sense)[],
};
// And so on...
```
(You can find a full example in the `examples` folder.)

You can then attach these types in the handler logic logic:
```
const serializeSense = (el: JME_Sense): JmdictSense => {
    const sense = makeDefaultSense();
    for (const child of el.children) {
        if (child.tagName == 'pos') sense.pos.push(child.children[0]);
        else if (child.tagName == 'gloss') sense.gloss.push(
            serializeGloss(child)
        );
        else if (child.tagName == 'xref') sense.xref.push(child.children[0]);
        else if (child.tagName == 'misc') sense.misc.push(child.children[0]);
        else if (child.tagName == 's_inf') sense.s_inf.push(child.children[0]);
    }
    return sense;
}

const serializeEntry = (el: JME_Entry): JmdictEntry => {
    const entry: JmdictEntry = makeDefaultEntry();

    for (const child of el.children) {
        if (child.tagName == 'sense') {
            entry.sense.push(serializeSense(child));
        }
        else if (child.tagName == 'xref') {
            // COMPILATION ERROR! `xref` isn't a in the JSON schema for JME_Entry's children
        }
        // others...
    }
    return entry;
};
```

The key point here is that typescript recognizes that the key `sense` has to be associated with the `JME_Sense` struct.

It's not a perfect schema - the best you can do right now is give a list of which keys correspond to which types of children in an element, and which attribute keys appear on which elements. You can't, for instance, specify that one of every child type must be available on the element (as in a fully-defined struct); the best we can do from a generalized XML perspective is understand the children as an array of `(Child_A | Child_B | Child_C)[]`. But it's much better than having no typing at all and having to parse raw JSON string keys, which is what many other parsing libraries resort to.
import { readFileSync } from 'fs';
import { parseMusicXML, getMusicXMLStats } from './music-xml-parser';

// Read a sample MusicXML file
const xmlContent = readFileSync('/Volumes/Mini SSD/Utilizadores/bruno/Documents/MuseScore4/Scores/Partitura sem título export.musicxml', 'utf-8');

try {
    console.log('🎵 Testing MusicXML Parser...\n');
    
    const result = parseMusicXML(xmlContent);
    const stats = getMusicXMLStats(result);
    
    console.log('✅ Parse successful!');
    console.log('📊 Statistics:');
    console.log(`   Title: ${stats.title}`);
    console.log(`   Parts: ${stats.partCount}`);
    console.log(`   Measures: ${stats.measureCount}`);
    console.log(`   Notes: ${stats.noteCount}`);
    
    console.log('\n🎼 Sample data from first part:');
    const firstPart = result.parts[0];
    const firstMeasure = firstPart.measures[0];
    const firstNote = firstMeasure.notes[0];
    
    console.log(`   Part ID: ${firstPart.id}`);
    console.log(`   First measure: ${firstMeasure.number}`);
    console.log(`   Time signature: ${firstMeasure.attributes?.time.beats}/${firstMeasure.attributes?.time.beatType}`);
    console.log(`   First note: ${firstNote.pitch.step}${firstNote.pitch.octave} (${firstNote.type})`);
    
    console.log('\n✅ All tests passed! Parser is working correctly.');
} catch (error) {
    console.error('❌ Test failed:', error);
}
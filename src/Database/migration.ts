import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export const migrateResidentsToNumericalIds = async () => {
  try {
    console.log('Starting to assign numerical IDs to residents...');

    const residentsRef = collection(db, 'residents');
    const q = query(residentsRef, orderBy('createdAt', 'asc'));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No residents found');
      return { success: true, updated: 0 };
    }

    console.log(`Found ${querySnapshot.size} residents to update`);

    const batchSize = 500;
    let batch = writeBatch(db);
    let batchCount = 0;
    let residentNumber = 1;
    const batches = [];

    querySnapshot.forEach((docSnapshot) => {
      const numericalId = String(residentNumber).padStart(3, '0');

      batch.update(doc(db, 'residents', docSnapshot.id), {
        residentNumber: numericalId,
      });

      batchCount++;
      residentNumber++;

      if (batchCount === batchSize) {
        batches.push(batch);
        batch = writeBatch(db);
        batchCount = 0;
        console.log(`Batch ready to commit: ${residentNumber - 1} residents processed`);
      }
    });

    if (batchCount > 0) {
      batches.push(batch);
      console.log(`Final batch ready to commit: ${residentNumber - 1} residents processed`);
    }

    console.log(`Committing ${batches.length} batch(es)...`);
    await Promise.all(batches.map(b => b.commit()));

    console.log(`Successfully assigned numerical IDs to ${residentNumber - 1} residents`);
    alert(`✅ Successfully assigned numerical IDs to ${residentNumber - 1} residents!`);
    
    return { success: true, updated: residentNumber - 1 };

  } catch (error) {
    console.error('Error assigning numerical IDs:', error);
    alert(`❌ Error: ${error}`);
    return { success: false, error: error };
  }
};
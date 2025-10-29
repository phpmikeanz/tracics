// FORCE CACHE CLEAR SCRIPT
// Run this in browser console to clear all caches

console.log('🧹 FORCING CACHE CLEAR...');

// Clear all caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
      console.log('🗑️ Deleted cache:', name);
    }
  });
}

// Clear localStorage
localStorage.clear();
console.log('🗑️ Cleared localStorage');

// Clear sessionStorage
sessionStorage.clear();
console.log('🗑️ Cleared sessionStorage');

// Clear any global shuffle functions
delete window.shuffleArray;
delete window.shuffleQuestionOptions;
delete window.shuffle;
console.log('🗑️ Cleared global shuffle functions');

// Force reload
console.log('🔄 Reloading page...');
window.location.reload(true);

console.log('✅ Cache clear complete!');


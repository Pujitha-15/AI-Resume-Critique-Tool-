document.getElementById('resumeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const file = form.querySelector('#resume').files[0];
    
    console.log('Submitting form with file:', {
        name: file?.name,
        type: file?.type,
        size: file?.size
    });
    
    // Show loading state
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Server error:', data);
            throw new Error(data.details || data.error || 'Failed to analyze resume');
        }
        
        // Hide loading state
        document.getElementById('loading').style.display = 'none';
        
        // Show results
        document.getElementById('result').style.display = 'block';
        document.getElementById('suggestions').textContent = data.suggestions;
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').style.display = 'none';
        alert(`Error: ${error.message}\n\nPlease check:\n1. The file is a valid PDF or TXT file\n2. The file is not corrupted\n3. You have entered a job description\n4. Your internet connection is stable`);
    }
});

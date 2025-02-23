use rayon::prelude::*;
use std::error::Error;
pub use wasm_bindgen_rayon::init_thread_pool;

pub struct PCA {
    mean: Vec<f64>,
    components: Vec<Vec<f64>>,
}

impl PCA {
    pub fn new() -> Self {
        Self {
            mean: Vec::new(),
            components: Vec::new(),
        }
    }

    pub fn fit(&mut self, x: &Vec<Vec<f64>>) -> Result<(), Box<dyn Error>> {
        let n = x.len();
        let m = x[0].len();

        // Step 1: Compute the mean
        self.mean = (0..m)
            .map(|j| x.iter().map(|row| row[j]).sum::<f64>() / n as f64)
            .collect();

        // Step 2: Center the data
        let centered_data: Vec<Vec<f64>> = x
            .iter()
            .map(|row| {
                row.iter()
                    .zip(&self.mean)
                    .map(|(&val, &mean)| val - mean)
                    .collect()
            })
            .collect();

        // Step 3: Compute the covariance matrix in parallel
        let covariance_matrix: Vec<Vec<f64>> = (0..m)
            .map(|i| {
                (0..m)
                    .map(|j| {
                        centered_data
                            .par_iter()
                            .map(|row| row[i] * row[j])
                            .sum::<f64>() / (n as f64 - 1.0)
                    })
                    .collect()
            })
            .collect();

        // Step 4: Eigen decomposition
        self.components = self.eigen_decomposition(&covariance_matrix)?;

        Ok(())
    }

    // Simple placeholder for eigen decomposition
    fn eigen_decomposition(&self, _cov_matrix: &Vec<Vec<f64>>) -> Result<Vec<Vec<f64>>, Box<dyn Error>> {
        // In a real implementation, replace with actual eigenvalue computation
        Ok(vec![vec![1.0; _cov_matrix.len()]; _cov_matrix.len()]) // Placeholder
    }

    pub fn transform(&self, x: &Vec<Vec<f64>>, n_components: usize) -> Result<Vec<Vec<f64>>, Box<dyn Error>> {
        if self.components.is_empty() {
            return Err("PCA has not been fitted yet.".into());
        }

        let mut transformed_data = Vec::new();
        for row in x {
            let mut transformed_row = vec![0.0; n_components];
            for i in 0..n_components {
                for j in 0..row.len() {
                    transformed_row[i] += row[j] * self.components[j][i];
                }
            }
            transformed_data.push(transformed_row);
        }

        Ok(transformed_data)
    }
}

fn main() -> Result<(), Box<dyn Error>> {
    let mut pca = PCA::new();

    let data = vec![
        vec![1.0, 2.0],
        vec![3.0, 4.0],
        vec![5.0, 6.0],
    ];

    pca.fit(&data)?;
    let transformed_data = pca.transform(&data, 1)?;

    for row in transformed_data {
        println!("{:?}", row);
    }

    Ok(())
}

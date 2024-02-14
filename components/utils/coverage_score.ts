


// # Calculate coverage score
// def calculate_coverage_score(subset, S_full, S_prior):
//     subset_indices = list(subset)
//     subset_df = S_full.iloc[subset_indices]

//     if isinstance(S_prior, pd.DataFrame):
//         subset = pd.concat([subset_df, S_prior])
//     elif S_prior == 0:
//         subset = subset_df
//     else:
//         print('hehe')
//     fp_counts_subset = get_fp_counts(subset)

//     # Calculate base and final coverage scores 
//     base_scores = get_base_coverage_scores(fp_counts_subset, fp_counts_full, len(subset), len(actual_s_full))
//     final_scores = get_final_coverage_scores(base_scores, fp_counts_subset, len(subset))

//     compound_scores = []

//     for index, row in subset.iterrows():
//         curr_score = []
//         for onbit in row['fp'].GetNonzeroElements().keys():
//             try:
//                 idx = final_scores[list(fp_counts_subset.keys()).index(onbit)]
//                 curr_score.append(idx)
//             except:
//                 pass
            
//         summed_compound_score = sum(curr_score)
        
//         compound_scores.append(summed_compound_score)
        
//     subset_score = sum(compound_scores)

    
//     return subset_score, subset.predictions.mean()

// # Get fingerprint counts
// def get_fp_counts(dataframe):
//     fp_counts = {}
//     for index, row in dataframe.iterrows():
//         for onbit in row['fp'].GetNonzeroElements().keys():
//             fp_counts[onbit] = fp_counts.get(onbit, 0) + 1
//     return fp_counts
                
// # Calculate base coverage score
// def get_base_coverage_scores(fp_counts_subset, fp_counts_full, N_subset, N_full):
    
//     alpha = 1
//     P_sampled = N_subset / N_full
    
//     base_scores = []
//     for fp, count in fp_counts_subset.items():
//         if fp_counts_full[fp] == N_full:
//             continue
//         P_smooth = (count + alpha) / (fp_counts_full[fp] + alpha/P_sampled) 
//         base_scores.append(-np.log(P_smooth/P_sampled))
        
//     return base_scores

// # Calculate final coverage score 
// def get_final_coverage_scores(base_scores, fp_counts_subset, N_subset):

//     final_scores = []
//     for i, score in enumerate(base_scores):
//         count = list(fp_counts_subset.values())[i]
        
//         p1 = count/N_subset
//         p2 = 1 - p1

//         if count == N_subset:
//             H = 0
//         else:
//             H = -(p1*np.log(p1) + p2*np.log(p2)) / np.log(2)
        
//         if score < 0 and count/N_subset > 0.5:
//             final_scores.append(score*(2 - H))

//         else:
//             final_scores.append(score*H)
            
//     return final_scores
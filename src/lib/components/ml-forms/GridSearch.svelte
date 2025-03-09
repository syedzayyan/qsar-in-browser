<!-- GridSearchConfig.svelte -->
<script lang="ts">
  // Types
  type HyperparameterRange = {
    min: number;
    max: number;
    step: number;
  };
  
  type Hyperparameters = {
    nEstimators: number;
    maxDepth: number;
    minSamplesLeaf: number;
    minInfoGain: number;
  };
  
  // Props passed from parent
  export let cvFolds: number;
  export let nEstimatorsRange: HyperparameterRange;
  export let maxDepthRange: HyperparameterRange;
  export let minSamplesLeafRange: HyperparameterRange;
  export let minInfoGainRange: HyperparameterRange;
  export let gridSearchParams: Hyperparameters[];
  export let generateGridCombinations: () => Hyperparameters[];
</script>

<div>
  <!-- CV Folds -->
  <div class="form-control mb-4">
    <label class="label">
      <span class="label-text">Cross-Validation Folds</span>
      <span class="label-text-alt">{cvFolds}-fold</span>
    </label>
    <input 
      type="range" 
      min="3" 
      max="10" 
      step="1" 
      class="range range-sm" 
      bind:value={cvFolds} 
    />
    <div class="flex justify-between text-xs px-2">
      <span>3</span>
      <span>10</span>
    </div>
  </div>
  
  <div class="divider">Grid Search Ranges</div>
  
  <!-- n_estimators Range -->
  <div class="form-control mb-6">
    <label class="label">
      <span class="label-text">Number of Trees Range</span>
      <span class="label-text-alt">{nEstimatorsRange.min} to {nEstimatorsRange.max} (step: {nEstimatorsRange.step})</span>
    </label>
    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class="label label-text">Min</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={nEstimatorsRange.min} 
          min="50" 
          max="2000"
        />
      </div>
      <div>
        <label class="label label-text">Max</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={nEstimatorsRange.max} 
          min="50" 
          max="2000"
        />
      </div>
      <div>
        <label class="label label-text">Step</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={nEstimatorsRange.step} 
          min="10" 
          max="500"
        />
      </div>
    </div>
  </div>
  
  <!-- Max Depth Range -->
  <div class="form-control mb-6">
    <label class="label">
      <span class="label-text">Max Depth Range</span>
      <span class="label-text-alt">{maxDepthRange.min} to {maxDepthRange.max} (step: {maxDepthRange.step})</span>
    </label>
    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class="label label-text">Min</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={maxDepthRange.min} 
          min="1" 
          max="50"
        />
      </div>
      <div>
        <label class="label label-text">Max</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={maxDepthRange.max} 
          min="1" 
          max="50"
        />
      </div>
      <div>
        <label class="label label-text">Step</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={maxDepthRange.step} 
          min="1" 
          max="10"
        />
      </div>
    </div>
  </div>
  
  <!-- Min Samples Leaf Range -->
  <div class="form-control mb-6">
    <label class="label">
      <span class="label-text">Min Samples Leaf Range</span>
      <span class="label-text-alt">{minSamplesLeafRange.min} to {minSamplesLeafRange.max} (step: {minSamplesLeafRange.step})</span>
    </label>
    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class="label label-text">Min</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minSamplesLeafRange.min} 
          min="1" 
          max="20"
        />
      </div>
      <div>
        <label class="label label-text">Max</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minSamplesLeafRange.max} 
          min="1" 
          max="20"
        />
      </div>
      <div>
        <label class="label label-text">Step</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minSamplesLeafRange.step} 
          min="1" 
          max="5"
        />
      </div>
    </div>
  </div>
  
  <!-- Min Info Gain Range -->
  <div class="form-control mb-6">
    <label class="label">
      <span class="label-text">Min Info Gain Range</span>
      <span class="label-text-alt">{minInfoGainRange.min.toFixed(4)} to {minInfoGainRange.max.toFixed(4)} (step: {minInfoGainRange.step.toFixed(4)})</span>
    </label>
    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class="label label-text">Min</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minInfoGainRange.min} 
          min="0.0001" 
          max="0.1"
          step="0.0001"
        />
      </div>
      <div>
        <label class="label label-text">Max</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minInfoGainRange.max} 
          min="0.0001" 
          max="0.1"
          step="0.0001"
        />
      </div>
      <div>
        <label class="label label-text">Step</label>
        <input 
          type="number" 
          class="input input-sm input-bordered w-full" 
          bind:value={minInfoGainRange.step} 
          min="0.0001" 
          max="0.01"
          step="0.0001"
        />
      </div>
    </div>
  </div>
  
  <!-- Warning about combinations -->
  <div class="alert alert-info shadow-lg mb-4">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span>Grid search will be limited to approximately 100 combinations for optimal performance.</span>
    </div>
  </div>
  
  <div>
    <button 
      type="button" 
      class="btn btn-outline btn-sm"
      on:click={generateGridCombinations}
    >
      Calculate Combinations
    </button>
    <span class="ml-4 text-sm">
      {gridSearchParams.length > 0 ? `${gridSearchParams.length} parameter combinations will be generated` : ''}
    </span>
  </div>
</div>

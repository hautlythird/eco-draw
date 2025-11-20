<template>
  <v-stage :config="stageConfig">
    <v-layer>
      <v-rect
        v-for="(rect, i) in rectangles"
        :key="i"
        :config="rect"
        @dragmove="handleRectDragMove"
      />
      <v-transformer
        ref="transformerRef"
        :config="transformerConfig"
        @dragmove="handleTransformerDragMove"
      />
    </v-layer>
  </v-stage>
</template>

<script>
export default {
  data() {
    return {
      stageConfig: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      rectangles: [
        {
          x: window.innerWidth / 2 - 60,
          y: window.innerHeight / 2 - 60,
          width: 50,
          height: 50,
          fill: 'red',
          draggable: true,
          id: 'rect1',
          name: 'my-rect'
        },
        {
          x: window.innerWidth / 2 + 10,
          y: window.innerHeight / 2 + 10,
          width: 50,
          height: 50,
          fill: 'green',
          draggable: true,
          id: 'rect2',
          name: 'my-rect'
        }
      ],
      transformerConfig: {
        nodes: [],
      }
    };
  },
  mounted() {
    // Setup transformer nodes after component is mounted
    this.$nextTick(() => {
      const transformer = this.$refs.transformerRef.getNode();
      const rects = transformer.getStage().find('.my-rect');
      
      // Set transformer to work with both rectangles
      transformer.nodes(rects);
      
      // Add boundary function for transformer
      transformer.boundBoxFunc(this.boundBoxFunc);
    });
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    getCorner(pivotX, pivotY, diffX, diffY, angle) {
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      angle += Math.atan2(diffY, diffX);
      const x = pivotX + distance * Math.cos(angle);
      const y = pivotY + distance * Math.sin(angle);
      return { x, y };
    },
    
    getClientRect(rotatedBox) {
      const { x, y, width, height } = rotatedBox;
      const rad = rotatedBox.rotation || 0;

      const p1 = this.getCorner(x, y, 0, 0, rad);
      const p2 = this.getCorner(x, y, width, 0, rad);
      const p3 = this.getCorner(x, y, width, height, rad);
      const p4 = this.getCorner(x, y, 0, height, rad);

      const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
      const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
      const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
      const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    
    getTotalBox(boxes) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      boxes.forEach((box) => {
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    
    boundBoxFunc(oldBox, newBox) {
      const box = this.getClientRect(newBox);
      
      const isOut =
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > this.stageConfig.width ||
        box.y + box.height > this.stageConfig.height;
        
      if (isOut) {
        return oldBox;
      }
      
      return newBox;
    },
    
    handleTransformerDragMove(e) {
      const transformer = this.$refs.transformerRef.getNode();
      const nodes = transformer.nodes();
      
      if (!nodes.length) return;
      
      const boxes = nodes.map(node => node.getClientRect());
      const box = this.getTotalBox(boxes);
      
      nodes.forEach(shape => {
        const absPos = shape.getAbsolutePosition();
        const offsetX = box.x - absPos.x;
        const offsetY = box.y - absPos.y;
        
        const newAbsPos = { x: absPos.x, y: absPos.y };
        
        if (box.x < 0) {
          newAbsPos.x = -offsetX;
        }
        if (box.y < 0) {
          newAbsPos.y = -offsetY;
        }
        if (box.x + box.width > this.stageConfig.width) {
          newAbsPos.x = this.stageConfig.width - box.width - offsetX;
        }
        if (box.y + box.height > this.stageConfig.height) {
          newAbsPos.y = this.stageConfig.height - box.height - offsetY;
        }
        
        shape.setAbsolutePosition(newAbsPos);
      });
    },
    
    handleRectDragMove(e) {
      // Individual rect drag handling is handled by transformer
    },
    
    handleResize() {
      this.stageConfig.width = window.innerWidth;
      this.stageConfig.height = window.innerHeight;
    }
  }
}
</script>

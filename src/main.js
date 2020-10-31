<%- include("javascripts/shaders/vert.js") %>
<%- include("javascripts/shaders/frag.js") %>
<%- include("javascripts/shaders/post-vert.js") %>
<%- include("javascripts/shaders/post-frag.js") %>

<%- include("javascripts/miku/positions.js") %>
<%- include("javascripts/miku/indices.js") %>
<%- include("javascripts/miku/uvs.js") %>
<%- include("javascripts/miku/normals.js") %>
<%- include("javascripts/miku/materials.js") %>

<%- include("javascripts/matrix.js") %>

(async function() {
    const canvas = document.getElementById("gl-canvas");
    const gl = canvas.getContext("webgl", { antialias: false });
  
    const supersamplingFactor = devicePixelRatio < 3 ? 2 : 1;
  
    // EXTENSIONS
  
    {
      gl.getExtension("WEBGL_depth_texture");
    }
  
    // DIMENSIONS
  
    const setDimensions = () => {
      canvas.style.height = "";
      canvas.style.width = "";
  
      const style = getComputedStyle(canvas);
  
      const height = Math.floor(parseFloat(style.getPropertyValue("height")));
      const width = Math.floor(parseFloat(style.getPropertyValue("width")));
  
      canvas.style.height = height + "px";
      canvas.style.width = width + "px";
  
      canvas.height = height * devicePixelRatio;
      canvas.width = width * devicePixelRatio;
    };
  
    setDimensions();
  
    // FLAGS
  
    {
      gl.clearColor(0.102, 0.102, 0.102, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.frontFace(gl.CCW);
      gl.cullFace(gl.BACK);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    }
  
    // SHADERS
  
    let program, postProgram;
    let positionLocation, normalLocation, tangentLocation, bitangentLocation, uvLocation;
    let hasNormalAndDisplacementLocation;
    let postPositionLocation, postUvLocation;
  
    {
      const reduceShaders = (program, obj) => {
        const shader = gl.createShader(obj.type);
  
        gl.shaderSource(shader, obj.source);
        gl.compileShader(shader);
  
        const msg = gl.getShaderInfoLog(shader);
  
        if (msg) throw msg;
  
        gl.attachShader(program, shader);
  
        return program;
      };
  
      const shaders = [
        {
          type: gl.VERTEX_SHADER,
          source: vert
        },
        {
          type: gl.FRAGMENT_SHADER,
          source: frag
        }
      ];
  
      const postShaders = [
        {
          type: gl.VERTEX_SHADER,
          source: postVert
        },
        {
          type: gl.FRAGMENT_SHADER,
          source: postFrag
        }
      ];
  
      ////
  
      postProgram = postShaders.reduce(reduceShaders, gl.createProgram());
      gl.linkProgram(postProgram);
      gl.useProgram(postProgram);
  
      postPositionLocation = gl.getAttribLocation(postProgram, "vert_pos");
      gl.enableVertexAttribArray(postPositionLocation);
  
      postUvLocation = gl.getAttribLocation(postProgram, "vert_uv");
      gl.enableVertexAttribArray(postUvLocation);
  
      ////
  
      program = shaders.reduce(reduceShaders, gl.createProgram());
      gl.linkProgram(program);
      gl.useProgram(program);
  
      positionLocation = gl.getAttribLocation(program, "vert_pos");
      gl.enableVertexAttribArray(positionLocation);
  
      normalLocation = gl.getAttribLocation(program, "vert_norm");
      gl.enableVertexAttribArray(normalLocation);
  
      tangentLocation = gl.getAttribLocation(program, "vert_tang");
      gl.enableVertexAttribArray(tangentLocation);
  
      bitangentLocation = gl.getAttribLocation(program, "vert_bitang");
      gl.enableVertexAttribArray(bitangentLocation);
  
      uvLocation = gl.getAttribLocation(program, "vert_uv");
      gl.enableVertexAttribArray(uvLocation);
  
      hasNormalAndDisplacementLocation = gl.getUniformLocation(program, "hasNormalAndDisplacement");
    }
  
    // MODEL DATA
  
    const model = {
      positions: positions,
      normals: normals,
      uvs: uvs,
      indices: indices,
      materials: materials,
      maps: maps
    };
  
    // TANGENT AND BITANGENTS
  
    const tangents = new Array(model.positions.length).fill(0);
    const bitangents = new Array(model.positions.length).fill(0);
  
    {
      const positionFromIndex = index => {
        return {
          x: model.positions[index * 3 + 0],
          y: model.positions[index * 3 + 1],
          z: model.positions[index * 3 + 2]
        };
      };
  
      const uvFromIndex = index => {
        return {
          x: model.uvs[index * 2 + 0],
          y: model.uvs[index * 2 + 1]
        };
      };
  
      const normalizeVector = vector => {
        const magnitude = vector.x + vector.y + vector.z;
  
        return {
          x: vector.x / magnitude,
          y: vector.y / magnitude,
          z: vector.z / magnitude
        };
      };
  
      for (let i = 0; i < indices.length; i += 3) {
        const i1 = model.indices[i + 0];
        const i2 = model.indices[i + 1];
        const i3 = model.indices[i + 2];
  
        const v1 = positionFromIndex(i1);
        const v2 = positionFromIndex(i2);
        const v3 = positionFromIndex(i3);
  
        const w1 = uvFromIndex(i1);
        const w2 = uvFromIndex(i2);
        const w3 = uvFromIndex(i3);
  
        const x1 = v2.x - v1.x;
        const x2 = v3.x - v1.x;
  
        const y1 = v2.y - v1.y;
        const y2 = v3.y - v1.y;
  
        const z1 = v2.z - v1.z;
        const z2 = v3.z - v1.z;
  
        const s1 = w2.x - w1.x;
        const s2 = w3.x - w1.x;
  
        const t1 = w2.y - w1.y;
        const t2 = w3.y - w1.y;
  
        const div = s1 * t2 - s2 * t1;
        const r = div === 0 ? 0.0 : 1.0 / div;
  
        const tangent = [(t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r, (t2 * z1 - t1 * z2) * r];
        const bitangent = [(s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r, (s1 * z2 - s2 * z1) * r];
  
        [i1, i2, i3].forEach(start => {
          for (let j = 0; j < 3; j++) {
            tangents[start * 3 + j] += tangent[j];
            bitangents[start * 3 + j] += bitangent[j];
          }
        });
      }
  
      // Perform Gram-Schmidt orthogonalization
      // and correct handedness if needed
  
      for (let i = 0; i < tangents.length; i += 3) {
        const nx = model.normals[i + 0];
        const ny = model.normals[i + 1];
        const nz = model.normals[i + 2];
  
        let tx = tangents[i + 0];
        let ty = tangents[i + 1];
        let tz = tangents[i + 2];
  
        const btx = bitangents[i + 0];
        const bty = bitangents[i + 1];
        const btz = bitangents[i + 2];
  
        // dot product
        const mul = nx * tx + ny * ty + nz * tz;
  
        tx -= nx * mul;
        ty -= ny * mul;
        tz -= nz * mul;
  
        // cross product
        // const cx = ty * nz - tz * ny;
        // const cy = tz * nx - tx * nz;
        // const cz = tx * ny - ty * nx;
  
        // dot product
        // const w = cx * btx + cy * bty + cz * btz;
  
        // if (w < 0) {
        //   tx *= -1;
        //   ty *= -1;
        //   tz *= -1;
        // }
  
        tangents[i + 0] = tx;
        tangents[i + 1] = ty;
        tangents[i + 2] = tz;
      }
    }
  
    // VBO AND IBO
  
    let positionVBO, normalVBO, tangentVBO, bitangentVBO, uvVBO, IBO;
  
    {
      positionVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.positions), gl.STATIC_DRAW);
  
      normalVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
  
      tangentVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
  
      bitangentVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bitangentVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
  
      uvVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.uvs), gl.STATIC_DRAW);
  
      IBO = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
    }
  
    let postPositionVBO, postUvVBO;
  
    {
      postPositionVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, postPositionVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0]), gl.STATIC_DRAW);
  
      postUvVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, postUvVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0]), gl.STATIC_DRAW);
    }
  
    // TEXTURES
  
    const normalTextureLocation = gl.getUniformLocation(program, "tex_norm");
    const diffuseTextureLocation = gl.getUniformLocation(program, "tex_diffuse");
    const depthTextureLocation = gl.getUniformLocation(program, "tex_depth");
  
    {
      const textureKeys = ["diffuse", "normal", "depth"];
      const defaultParams = {
        format: "RGBA",
        type: "UNSIGNED_BYTE",
        magFilter: "LINEAR",
        minFilter: "LINEAR_MIPMAP_LINEAR",
        wrapS: "REPEAT",
        wrapT: "REPEAT",
        flipY: false,
        premultiplyAlpha: false,
        unpackAlignment: 4,
        generateMipmaps: true
      };
  
      await Promise.all(
        model.materials.map(material => {
          return Promise.all(
            textureKeys.map(key => {
              return new Promise((resolve, reject) => {
                if (material[key] == null) return resolve(null);
  
                const image = new Image();
                image.crossOrigin = "anonymous";
  
                image.onload = event => {
                  const texture = gl.createTexture();
                  const mapInfo = material[key + "Info"] || {};
                  const params = Object.keys(defaultParams).reduce((obj, param) => {
                    obj[param] = mapInfo[param] === undefined ? defaultParams[param] : mapInfo[param];
  
                    return obj;
                  }, {});
  
                  gl.bindTexture(gl.TEXTURE_2D, texture);
                  gl.texImage2D(gl.TEXTURE_2D, 0, gl[params.format], gl[params.format], gl[params.type], image);
  
                  if (params.generateMipmaps) gl.generateMipmap(gl.TEXTURE_2D);
  
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[params.magFilter]);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[params.minFilter]);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[params.wrapS]);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[params.wrapT]);
  
                  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, params.flipY);
                  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, params.premultiplyAlpha);
                  gl.pixelStorei(gl.UNPACK_ALIGNMENT, params.unpackAlignment);
  
                  material[key + "Texture"] = texture;
  
                  resolve(null);
                };
  
                image.onerror = error => {
                  console.error(error);
                  resolve(null);
                };
  
                image.src = model.maps[material[key]];
              });
            })
          );
        })
      );
    }
  
    // MATRICES
  
    let perspectiveMatrix = matrix.perspective(45, canvas.width / canvas.height, 0.1, 1000.0);
    const translationMatrix = matrix.translation(0, -10.5, -28);
  
    let rotationYMatrix = matrix.rotationY(0);
  
    let modelMatrix = matrix.identity();
  
    const modelMatrixLocation = gl.getUniformLocation(program, "model_mtx");
    const normalMatrixLocation = gl.getUniformLocation(program, "norm_mtx");
    const projectionMatrixLocation = gl.getUniformLocation(program, "proj_mtx");
  
    // FRAMEBUFFER
  
    gl.useProgram(postProgram);
  
    const resolutionLocation = gl.getUniformLocation(postProgram, "resolution");
    gl.uniform2f(resolutionLocation, canvas.width * supersamplingFactor, canvas.height * supersamplingFactor);
  
    const postDiffuseTextureLocation = gl.getUniformLocation(postProgram, "tex_diffuse");
  
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  
    const renderTarget = gl.createTexture();
  
    gl.bindTexture(gl.TEXTURE_2D, renderTarget);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width * supersamplingFactor, canvas.height * supersamplingFactor, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTarget, 0);
  
    const depthTarget = gl.createTexture();
  
    gl.bindTexture(gl.TEXTURE_2D, depthTarget);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT,
      canvas.width * supersamplingFactor,
      canvas.height * supersamplingFactor,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTarget, 0);
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
    // DRAW
  
    const rotationCoefficient = 0.0075;
    const timeCoefficient = (Math.PI * 2) / rotationCoefficient;
  
    requestAnimationFrame(draw);
  
    function draw(time = 0) {
      {
        if (supersamplingFactor !== 1) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        }
  
        gl.useProgram(program);
        gl.viewport(0, 0, canvas.width * supersamplingFactor, canvas.height * supersamplingFactor);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  
        rotationYMatrix = matrix.rotationY(time * rotationCoefficient);
        modelMatrix = matrix.mul(translationMatrix, rotationYMatrix);
  
        gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
        gl.uniformMatrix4fv(normalMatrixLocation, false, matrix.transpose(matrix.inverse(modelMatrix)));
        gl.uniformMatrix4fv(projectionMatrixLocation, false, matrix.mul(perspectiveMatrix, modelMatrix));
  
        gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentVBO);
        gl.vertexAttribPointer(tangentLocation, 3, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, bitangentVBO);
        gl.vertexAttribPointer(bitangentLocation, 3, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, uvVBO);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IBO);
  
        model.materials.reduce((drawnCount, material, index) => {
          if (!material.disabled) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, material.normalTexture);
            gl.uniform1i(normalTextureLocation, 0);
  
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, material.diffuseTexture);
            gl.uniform1i(diffuseTextureLocation, 1);
  
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, material.depthTexture);
            gl.uniform1i(depthTextureLocation, 2);
  
            if (material.normal && material.depth) {
              gl.uniform1f(hasNormalAndDisplacementLocation, 1.0);
            } else {
              gl.uniform1f(hasNormalAndDisplacementLocation, 0.0);
            }
  
            gl.drawElements(gl.TRIANGLES, material.faceCount * 3, gl.UNSIGNED_SHORT, drawnCount * 2);
          }
  
          drawnCount += material.faceCount * 3;
  
          return drawnCount;
        }, 0);
      }
  
      if (supersamplingFactor !== 1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(postProgram);
        gl.viewport(0, 0, canvas.width, canvas.height);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, postPositionVBO);
        gl.vertexAttribPointer(postPositionLocation, 2, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ARRAY_BUFFER, postUvVBO);
        gl.vertexAttribPointer(postUvLocation, 2, gl.FLOAT, false, 0, 0);
  
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderTarget);
        gl.uniform1i(postDiffuseTextureLocation, 0);
  
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
  
      requestAnimationFrame(() => {
        draw(++time % timeCoefficient);
      });
  
      let resizeCount = 0;
      window.addEventListener("resize", event => {
        resizeCount++;
  
        setTimeout(() => {
          resizeCount--;
  
          if (resizeCount === 0) {
            setDimensions();
  
            perspectiveMatrix = matrix.perspective(45, canvas.width / canvas.height, 0.1, 1000.0);
  
            gl.uniform2f(resolutionLocation, canvas.width * supersamplingFactor, canvas.height * supersamplingFactor);
  
            gl.bindTexture(gl.TEXTURE_2D, renderTarget);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width * supersamplingFactor, canvas.height * supersamplingFactor, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
            gl.bindTexture(gl.TEXTURE_2D, depthTarget);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.DEPTH_COMPONENT,
              canvas.width * supersamplingFactor,
              canvas.height * supersamplingFactor,
              0,
              gl.DEPTH_COMPONENT,
              gl.UNSIGNED_INT,
              null
            );
          }
        }, 500);
      });
    }
  })();
  